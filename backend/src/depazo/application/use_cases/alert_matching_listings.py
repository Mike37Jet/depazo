from depazo.application.dto.listing_alert import AlertKind, ListingAlert
from depazo.application.ports.notifier import Notifier
from depazo.application.use_cases.record_listings import RecordingSummary
from depazo.domain.listing import Listing
from depazo.domain.scoring import score_listing
from depazo.domain.search_profile import SearchProfile


class AlertMatchingListings:
    def __init__(self, notifier: Notifier) -> None:
        self._notifier = notifier

    async def execute(
        self, summary: RecordingSummary, profile: SearchProfile
    ) -> tuple[ListingAlert, ...]:
        candidates = [(listing, AlertKind.NEW) for listing in summary.new_listings] + [
            (listing, AlertKind.NEW_PRICE) for listing in summary.repriced_listings
        ]
        possible_alerts = (self._alert_for(listing, kind, profile) for listing, kind in candidates)
        alerts = sorted(
            (alert for alert in possible_alerts if alert is not None),
            key=lambda alert: alert.result.total,
            reverse=True,
        )
        if alerts:
            await self._notifier.send_alerts(alerts)
        return tuple(alerts)

    @staticmethod
    def _alert_for(
        listing: Listing, kind: AlertKind, profile: SearchProfile
    ) -> ListingAlert | None:
        result = score_listing(listing, profile)
        if not result.passed_hard_filters or result.total < profile.min_score:
            return None
        return ListingAlert(listing=listing, result=result, kind=kind)
