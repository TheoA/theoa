## Testing

### Run Tests

```bash
npm test              # Headless (CI default)
npm run test:headed   # Visible browser, 100ms slowmo
npm run test:slow     # Visible browser, 1s slowmo for debugging
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `E2E_HEADED` | `false` | Set to `true` for visible browser |
| `E2E_SLOWMO` | `0` | Slowdown in ms between operations |
