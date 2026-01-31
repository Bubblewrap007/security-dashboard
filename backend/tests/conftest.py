import os
# Ensure app modules detect test mode early
os.environ.setdefault("TESTING", "1")

# Also ensure the RateLimitMiddleware is not active on the app during tests.
# Some imports may add the middleware before pytest can set flags; proactively remove it.
import app.main as main_mod
app = getattr(main_mod, "app", None)
if app is not None:
    # Remove any registered RateLimitMiddleware
    before = list(app.user_middleware)
    def is_ratelimit(m):
        # support both starlette.datastructures.Middleware objects and dict-style entries
        try:
            cls = getattr(m, "cls", None)
            if cls is None and isinstance(m, dict):
                cls = m.get("cls")
            return getattr(cls, "__name__", "") == "RateLimitMiddleware"
        except Exception:
            return False
    app.user_middleware = [m for m in app.user_middleware if not is_ratelimit(m)]
    if len(app.user_middleware) != len(before):
        print("Removed RateLimitMiddleware from app for tests")
