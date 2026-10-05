"""Prepara en out/cache los recursos gráficos que usan los generadores."""
import common as c
for who in ("nina", "nino"):
    for pose in ("stand", "wave", "cheer"):
        c.character(who, pose)
c.logo_cimiento(); c.logo_ieoh(); c.illustrations()
print("cache listo:", c.CACHE)
