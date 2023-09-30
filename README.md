<p align="center">
  <img alt="NUS BetterNextBus Logo" src="./static/512x512.png" width="70" />
</p>
<h1 align="center">
  BetterNextBus 
</h1>

> A minimal **PWA** for fetching and displaying NUS Internal Shuttle Bus routes & arrival timings

## Motivation

Just personally wanted a less bloated, faster NextBus. 

Also, when location services load slowly, so does the app on boot. There isn't an option to disable this functionality (as far as I know on *Android*) except for disabling it entirely.


## Features
- Geolocation 📍
- Reactive Search 📑
- Bookmarking 📒
- Dark Mode 🌑
- Add to home screen 📱 (**iOS** users do not get the pop-up)


## Developing

This project uses Bun as the package manager but feel free to delete `bun.lockb` and install
with `pnpm`/`npm`/`yarn`.

Install dependencies

```bash
bun install

cp .env.example .env # setup ur config here
```
Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
bun run dev
```

## Disclaimer

Only shuttle timing data is dynamically fetched, while route & stops are served static under `lib/data/<DATA>.json` in order to minimise network usage. 

Given this, the data presented including any inaccuracies will be global across all applications.

By using this service, you agree to abide by the [NUS Acceptable Use Policy for IT Resources](https://nus.edu.sg/registrar/docs/info/registration-guides/aup-form.pdf).
