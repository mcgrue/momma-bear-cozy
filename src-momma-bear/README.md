# Momma Bear standalone demo

Momma Bear is a zero-dependency browser terrain demo.

From the repository root:

```powershell
npm start
```

Then open <http://127.0.0.1:4173/>. You can also open
`momma-bear/index.html` directly from disk.

Use the controls to enter a reproducible seed and select Continents, Pangaea,
or Archipelago. The URL records both values so a generated world can be shared.
The numbered markers are balanced player starts; colored dots identify food,
production, strategic, and luxury resources.

If port 4173 is occupied, choose another one in PowerShell:

```powershell
$env:PORT=4174; npm start
```

To create a static distribution:

```powershell
npm run build
```

The deployable output is written to `src-momma-bear/dist/momma-bear-demo`.
Upload that directory to any static host or open its `index.html` locally.

The standalone entrypoint is `momma-bear/index.html`. World generation lives in
`momma-bear/map-generator.js`; canvas rendering and interaction live in
`momma-bear/standalone.js`.
