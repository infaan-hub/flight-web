"""Lightweight in-memory rate limiting and response caching to protect external API quota.

Rate limits are per-client-IP, sliding-window. Caching uses Django's LocMemCache
(per-process; adequate for single-worker gunicorn deployments).
"""
import functools
import threading
import time

from django.core.cache import cache

_LOCK = threading.Lock()
_RATE_LIMITS = {}
_REQUESTS = {}

DEFAULT_LIMITS = {
    'live-flights': (15, 60),
    'search': (30, 60),
    'today': (30, 60),
    'detail': (30, 60),
    'track': (30, 60),
    'board': (30, 60),
    'stream': (4, 60),
    'stats': (60, 60),
}


def register_rate_limit(key, max_requests, window_seconds):
    _RATE_LIMITS[key] = (max_requests, window_seconds)


for _k, _v in DEFAULT_LIMITS.items():
    register_rate_limit(_k, _v[0], _v[1])


def client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', 'unknown')


def is_rate_limited(key, identity):
    """Return True if `identity` has exceeded the limit for `key`."""
    limit = _RATE_LIMITS.get(key)
    if not limit:
        return False
    max_requests, window = limit
    now = time.time()
    bucket = f'{key}:{identity}'
    with _LOCK:
        timestamps = [t for t in _REQUESTS.get(bucket, []) if now - t < window]
        if len(timestamps) >= max_requests:
            _REQUESTS[bucket] = timestamps
            return True
        timestamps.append(now)
        _REQUESTS[bucket] = timestamps
        return False


def cache_get(key):
    return cache.get(key)


def cache_set(key, value, ttl_seconds):
    cache.set(key, value, ttl_seconds)


def cached_result(ttl_seconds):
    """Decorator: memoize the return value of a no-arg callable in the cache."""
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            key = f'fn:{fn.__module__}:{fn.__name__}:{args}:{sorted(kwargs.items())}'
            hit = cache_get(key)
            if hit is not None:
                return hit
            result = fn(*args, **kwargs)
            cache_set(key, result, ttl_seconds)
            return result
        return wrapper
    return decorator
