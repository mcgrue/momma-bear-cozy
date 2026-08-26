# Momma Bear

A zero-dependency browser terrain experiment.

```powershell
npm start
```

Open <http://127.0.0.1:4173/>. Run `npm test` for the regression suite or
`npm run build` to create the static distribution.

Maps are reproducible by seed and support Continents, Pangaea, and Archipelago
generation. The pipeline builds elevation and climate fields, drains rivers to
the ocean, assigns biomes, and balances four starts with nearby resources.
