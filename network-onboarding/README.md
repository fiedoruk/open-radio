# Local network onboarding prototype

Run the project server and open the local portal:

```bash
npm run simulator
```

`http://127.0.0.1:4173/network-onboarding/`

On the simulator host the page falls back to synthetic networks and in-memory
state. On the device it calls only the local `/api/networks` and
`/api/config-form` routes. It never calls a remote API, writes browser storage or
retains the password after the connect action. Open networks remain blocked.
