# Come rifare l'APK

L'app Android è un guscio: apre `personale-ferie.netlify.app/?pizzeria=pomodoro`
a schermo intero. Dentro c'è lo stesso sito, quindi **per aggiornare l'app basta
pubblicare il sito**: l'APK va rifatto solo se cambiano il nome, l'icona o la
pizzeria da mostrare.

## Cosa serve

- Android Studio installato (per l'SDK)
- un JDK 17 — su questo computer sta in
  `C:\Users\Paolo\.gradle\jdks\eclipse_adoptium-17-amd64-windows.2`
- Node

Bubblewrap va configurato una volta sola, scrivendo in
`%USERPROFILE%\.bubblewrap\config.json` (senza BOM):

```json
{"jdkPath":"C:\\Users\\Paolo\\.gradle\\jdks\\eclipse_adoptium-17-amd64-windows.2","androidSdkPath":"C:\\Users\\Paolo\\AppData\\Local\\Android\\Sdk"}
```

## I passi

Da una cartella di lavoro fuori dal progetto (qui: `Desktop\Personale e Ferie\apk-pomodoro`),
con dentro il file `twa-manifest.json` che sta qui accanto:

```
npx @bubblewrap/cli update --skipVersionUpgrade
gradlew.bat assembleDebug --no-daemon
```

L'APK esce in `app\build\outputs\apk\debug\app-debug.apk`.

## La firma

L'APK è firmato con la chiave di sviluppo di Android (`~/.android/debug.keystore`),
che basta per installarlo a mano sul proprio telefono. La sua impronta è dentro
`public/.well-known/assetlinks.json`: è quel file, servito dal sito, che dice ad
Android «questa app è autorizzata su questo indirizzo» e fa sparire la barra
dell'indirizzo. **Se un domani si firma l'APK con un'altra chiave, va aggiornata
anche l'impronta lì dentro.**

Per una seconda app di Fratelli D'Auria: stesso `twa-manifest.json` con
`?pizzeria=dauria`, un altro `packageId`, l'icona `icona-dauria-512.png`, e una
seconda voce in `assetlinks.json`.
