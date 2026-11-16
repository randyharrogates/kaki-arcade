# C-01 manual restart check (attack scripts a3/a4)

Run locally only. Set `KAKI_PORT_SIGNAL` to the issue's assigned port. Disable Wrangler
telemetry (`WRANGLER_SEND_METRICS=false`) and use `--local --env dev`. Keep the same local
persistence directory across the restart. Do not deploy or use remote bindings.

1. POST `/rooms` with Origin `http://localhost:5090`; keep the raw code and hostToken locally.
2. Open `/rooms/CODE/host` offering subprotocols `kaki.v1` and `kaki.host.<hostToken>`.
   Check the upgrade selects only `kaki.v1`, attachment sends `created.reopened === false`, and
   the message contains the authenticated hostToken and passes decodeToHostSignal.
   Send no create/reopen message.
3. Open eight `/rooms/CODE/phone` sockets offering only `kaki.v1` and send `join` with a null
   roomToken. Keep them open.
4. Kill the local Wrangler/workerd process abruptly, rather than sending socket closes.
5. Restart using the same port and persistence directory. Offer kaki.v1 and
   kaki.host.<saved hostToken> on the host upgrade again.
6. Check `created.reopened === true` and **zero** `peer-joined` messages for the eight dead sockets.
7. Join eight fresh phones: all must succeed. A ninth fresh phone must receive `room-full`
   then close. Replace the host with another authenticated upgrade: exactly eight live peers must be replayed.
8. Close all live sockets. Inspect the local alarm: it must be ten minutes after the final
   close, not ten minutes after creation or host closure. After it fires the room record must
   be gone and the upgrade must return HTTP 404. Absolute expiry is twelve hours after creation.
9. Save the observed output in `uat/evidence/C-01-pairing-server/`; remove temporary secrets.

The automated fake tests simulate storage surviving while transport sockets disappear, including
ordinary peer-left effects, capacity recovery and alarm-driven storage wipe. This manual check
covers the actual local runtime's kill/restart behaviour; it remains an integrator check.

Before the valid host upgrade, try absent and wrong-token subprotocols: both must return HTTP
401 with no socket and no secret in response headers/body. With eight phones and four silent
phone sockets, bad host upgrades must not evict anything; a valid host still replaces its
predecessor (close reason `replaced`). Silent phones still have their original ten-second deadline.
