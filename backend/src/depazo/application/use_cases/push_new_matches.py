from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from decimal import Decimal

from depazo.application.dto.listing_alert import AlertKind, ListingAlert
from depazo.application.ports.push_sender import PushDelivery, PushMessage, PushSender
from depazo.application.ports.unit_of_work import UnitOfWork
from depazo.application.use_cases.record_listings import RecordingSummary
from depazo.domain.listing import Listing
from depazo.domain.listing_reaction import ListingKey, Reaction
from depazo.domain.push_subscription import PushSubscription
from depazo.domain.scoring import monthly_cost_usd, score_listing
from depazo.domain.search_profile import SearchProfile

MATCHES_URL = "/"


@dataclass(frozen=True, slots=True)
class PushReport:
    notified_users: int
    delivered_count: int
    removed_count: int


@dataclass(frozen=True, slots=True)
class _Recipient:
    profile: SearchProfile
    subscriptions: Sequence[PushSubscription]
    reactions: Mapping[ListingKey, Reaction]


class PushNewMatches:
    def __init__(self, open_unit_of_work: Callable[[], UnitOfWork], sender: PushSender) -> None:
        self._open_unit_of_work = open_unit_of_work
        self._sender = sender

    async def execute(self, summary: RecordingSummary) -> PushReport:
        candidates = [(listing, AlertKind.NEW) for listing in summary.new_listings] + [
            (listing, AlertKind.NEW_PRICE) for listing in summary.repriced_listings
        ]
        if not candidates:
            return PushReport(notified_users=0, delivered_count=0, removed_count=0)
        recipients = await self._recipients()
        notified_users = delivered_count = 0
        gone_endpoints: list[str] = []
        for recipient in recipients:
            alerts = alerts_for(candidates, recipient.profile, recipient.reactions)
            if not alerts:
                continue
            notified_users += 1
            message = describe_alerts(alerts, recipient.profile)
            for subscription in recipient.subscriptions:
                delivery = await self._sender.send(subscription, message)
                if delivery is PushDelivery.DELIVERED:
                    delivered_count += 1
                elif delivery is PushDelivery.GONE:
                    gone_endpoints.append(subscription.endpoint)
        await self._forget(gone_endpoints)
        return PushReport(
            notified_users=notified_users,
            delivered_count=delivered_count,
            removed_count=len(gone_endpoints),
        )

    async def _recipients(self) -> list[_Recipient]:
        recipients: list[_Recipient] = []
        async with self._open_unit_of_work() as unit_of_work:
            for user_id, profile in await unit_of_work.search_profiles.list_all():
                subscriptions = await unit_of_work.push_subscriptions.list_for_user(user_id)
                if subscriptions:
                    reactions = await unit_of_work.listing_reactions.reactions_for_user(user_id)
                    recipients.append(_Recipient(profile, subscriptions, reactions))
        return recipients

    async def _forget(self, endpoints: Sequence[str]) -> None:
        if not endpoints:
            return
        async with self._open_unit_of_work() as unit_of_work:
            for endpoint in endpoints:
                await unit_of_work.push_subscriptions.remove(endpoint)
            await unit_of_work.commit()


def alerts_for(
    candidates: Sequence[tuple[Listing, AlertKind]],
    profile: SearchProfile,
    reactions: Mapping[ListingKey, Reaction],
) -> list[ListingAlert]:
    alerts = []
    for listing, kind in candidates:
        if reactions.get(ListingKey.of(listing)) is Reaction.DISCARDED:
            continue
        result = score_listing(listing, profile)
        if result.passed_hard_filters and result.total >= profile.min_score:
            alerts.append(ListingAlert(listing=listing, result=result, kind=kind))
    return sorted(alerts, key=lambda alert: alert.result.total, reverse=True)


def describe_alerts(alerts: Sequence[ListingAlert], profile: SearchProfile) -> PushMessage:
    best = alerts[0]
    summary = _summarize(best, profile)
    if len(alerts) > 1:
        return PushMessage(
            title=f"{len(alerts)} departamentos nuevos para ti",
            body=f"El mejor: {summary}",
            url=MATCHES_URL,
        )
    title = (
        "Nuevo departamento para ti"
        if best.kind is AlertKind.NEW
        else "Cambió el precio de un departamento"
    )
    return PushMessage(title=title, body=summary, url=MATCHES_URL)


def _summarize(alert: ListingAlert, profile: SearchProfile) -> str:
    place = alert.listing.neighborhood or alert.listing.city or "Quito"
    parts = [place]
    cost = monthly_cost_usd(alert.listing, profile)
    if cost is not None:
        parts.append(f"{_format_usd(cost)}/mes")
    parts.append(f"{alert.result.total} puntos")
    return " · ".join(parts)


def _format_usd(amount: Decimal) -> str:
    return f"${amount:,.0f}"
