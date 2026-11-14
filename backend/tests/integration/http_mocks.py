import httpx
import respx


def serve_robots(host: str, rules: str = "User-agent: *\nAllow: /\n") -> respx.Route:
    return respx.get(f"https://{host}/robots.txt").mock(
        return_value=httpx.Response(200, text=rules)
    )
