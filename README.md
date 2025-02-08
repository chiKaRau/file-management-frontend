[![Angular Logo](https://www.vectorlogo.zone/logos/angular/angular-icon.svg)](https://angular.io/) [![Electron Logo](https://www.vectorlogo.zone/logos/electronjs/electronjs-icon.svg)](https://electronjs.org/)

![Maintained][maintained-badge]
[![Make a pull request][prs-badge]][prs]
[![License][license-badge]](LICENSE.md)

[![Linux Build][linux-build-badge]][linux-build]
[![MacOS Build][macos-build-badge]][macos-build]
[![Windows Build][windows-build-badge]][windows-build]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

# Introduction

Bootstrap and package your project with Angular 17 and Electron 30 (Typescript + SASS + Hot Reload) for creating Desktop applications.

Currently runs with:

- Angular v17.3.6
- Electron v30.0.1

With this sample, you can:

- Run your app in a local development environment with Electron & Hot reload
- Run your app in a production environment
- Execute your tests with Jest and Playwright (E2E)
- Package your app into an executable file for Linux, Windows & Mac

/!\ Hot reload only pertains to the renderer process. The main electron process is not able to be hot reloaded, only restarted.

/!\ Angular CLI & Electron Builder needs Node 18.10 or later to work correctly.

## Getting Started

*Clone this repository locally:*

``` bash
git clone https://github.com/maximegris/angular-electron.git
```

*Install dependencies with npm (used by Electron renderer process):*

``` bash
npm install
```

There is an issue with `yarn` and `node_modules` when the application is built by the packager. Please use `npm` as dependencies manager.

If you want to generate Angular components with Angular-cli , you **MUST** install `@angular/cli` in npm global context.
Please follow [Angular-cli documentation](https://github.com/angular/angular-cli) if you had installed a previous version of `angular-cli`.

``` bash
npm install -g @angular/cli
```

*Install NodeJS dependencies with npm (used by Electron main process):*

``` bash
cd app/
npm install
```

Why two package.json ? This project follow [Electron Builder two package.json structure](https://www.electron.build/tutorials/two-package-structure) in order to optimize final bundle and be still able to use Angular `ng add` feature.

## To build for development

- **in a terminal window** -> npm start

Voila! You can use your Angular + Electron app in a local development environment with hot reload!

The application code is managed by `app/main.ts`. In this sample, the app runs with a simple Angular App (http://localhost:4200), and an Electron window. \
The Angular component contains an example of Electron and NodeJS native lib import. \
You can disable "Developer Tools" by commenting `win.webContents.openDevTools();` in `app/main.ts`.

## Project structure

| Folder | Description                                      |
|--------|--------------------------------------------------|
| app    | Electron main process folder (NodeJS)            |
| src    | Electron renderer process folder (Web / Angular) |

## How to import 3rd party libraries

This sample project runs in both modes (web and electron). To make this work, **you have to import your dependencies the right way**. \

There are two kind of 3rd party libraries :
- NodeJS's one - Uses NodeJS core module (crypto, fs, util...)
    - I suggest you add this kind of 3rd party library in `dependencies` of both `app/package.json` and `package.json (root folder)` in order to make it work in both Electron's Main process (app folder) and Electron's Renderer process (src folder).

Please check `providers/electron.service.ts` to watch how conditional import of libraries has to be done when using NodeJS / 3rd party libraries in renderer context (i.e. Angular).

- Web's one (like bootstrap, material, tailwind...)
    - It have to be added in `dependencies` of `package.json  (root folder)`

## Add a dependency with ng-add

You may encounter some difficulties with `ng-add` because this project doesn't use the defaults `@angular-builders`. \
For example you can find [here](HOW_TO.md) how to install Angular-Material with `ng-add`.

## Browser mode

Maybe you only want to execute the application in the browser with hot reload? Just run `npm run ng:serve:web`.

## Included Commands

| Command                  | Description                                                                                           |
|--------------------------|-------------------------------------------------------------------------------------------------------|
| `npm run ng:serve`       | Execute the app in the web browser (DEV mode)                                                         |
| `npm run web:build`      | Build the app that can be used directly in the web browser. Your built files are in the /dist folder. |
| `npm run electron:local` | Builds your application and start electron locally                                                    |
| `npm run electron:build` | Builds your application and creates an app consumable based on your operating system                  |

**Your application is optimised. Only /dist folder and NodeJS dependencies are included in the final bundle.**

## You want to use a specific lib (like rxjs) in electron main thread ?

YES! You can do it! Just by importing your library in npm dependencies section of `app/package.json` with `npm install --save XXXXX`. \
It will be loaded by electron during build phase and added to your final bundle. \
Then use your library by importing it in `app/main.ts` file. Quite simple, isn't it?

## E2E Testing

E2E Test scripts can be found in `e2e` folder.

| Command       | Description               |
|---------------|---------------------------|
| `npm run e2e` | Execute end to end tests  |

Note: To make it work behind a proxy, you can add this proxy exception in your terminal  
`export {no_proxy,NO_PROXY}="127.0.0.1,localhost"`

## Debug with VsCode

[VsCode](https://code.visualstudio.com/) debug configuration is available! In order to use it, you need the extension [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome).

Then set some breakpoints in your application's source code.

Finally from VsCode press **Ctrl+Shift+D** and select **Application Debug** and press **F5**.

Please note that Hot reload is only available in Renderer process.

## Want to use Angular Material ? Ngx-Bootstrap ?

Please refer to [HOW_TO file](./HOW_TO.md)

## Branch & Packages version

- Angular 4 & Electron 1 : Branch [angular4](https://github.com/maximegris/angular-electron/tree/angular4)
- Angular 5 & Electron 1 : Branch [angular5](https://github.com/maximegris/angular-electron/tree/angular5)
- Angular 6 & Electron 3 : Branch [angular6](https://github.com/maximegris/angular-electron/tree/angular6)
- Angular 7 & Electron 3 : Branch [angular7](https://github.com/maximegris/angular-electron/tree/angular7)
- Angular 8 & Electron 7 : Branch [angular8](https://github.com/maximegris/angular-electron/tree/angular8)
- Angular 9 & Electron 7 : Branch [angular9](https://github.com/maximegris/angular-electron/tree/angular9)
- Angular 10 & Electron 9 : Branch [angular10](https://github.com/maximegris/angular-electron/tree/angular10)
- Angular 11 & Electron 12 : Branch [angular11](https://github.com/maximegris/angular-electron/tree/angular11)
- Angular 12 & Electron 16 : Branch [angular12](https://github.com/maximegris/angular-electron/tree/angular12)
- Angular 13 & Electron 18 : Branch [angular13](https://github.com/maximegris/angular-electron/tree/angular13)
- Angular 14 & Electron 21 : Branch [angular14](https://github.com/maximegris/angular-electron/tree/angular14)
- Angular 15 & Electron 24 : Branch [angular15](https://github.com/maximegris/angular-electron/tree/angular15)
- Angular 16 & Electron 25 : Branch [angular16](https://github.com/maximegris/angular-electron/tree/angular16)
- Angular 17 & Electron 30 : (main)
- 
[maintained-badge]: https://img.shields.io/badge/maintained-yes-brightgreen
[license-badge]: https://img.shields.io/badge/license-MIT-blue.svg
[license]: https://github.com/maximegris/angular-electron/blob/main/LICENSE.md
[prs-badge]: https://img.shields.io/badge/PRs-welcome-red.svg
[prs]: http://makeapullrequest.com

[linux-build-badge]: https://github.com/maximegris/angular-electron/workflows/Linux%20Build/badge.svg
[linux-build]: https://github.com/maximegris/angular-electron/actions?query=workflow%3A%22Linux+Build%22
[macos-build-badge]: https://github.com/maximegris/angular-electron/workflows/MacOS%20Build/badge.svg
[macos-build]: https://github.com/maximegris/angular-electron/actions?query=workflow%3A%22MacOS+Build%22
[windows-build-badge]: https://github.com/maximegris/angular-electron/workflows/Windows%20Build/badge.svg
[windows-build]: https://github.com/maximegris/angular-electron/actions?query=workflow%3A%22Windows+Build%22

[github-watch-badge]: https://img.shields.io/github/watchers/maximegris/angular-electron.svg?style=social
[github-watch]: https://github.com/maximegris/angular-electron/watchers
[github-star-badge]: https://img.shields.io/github/stars/maximegris/angular-electron.svg?style=social
[github-star]: https://github.com/maximegris/angular-electron/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Check%20out%20angular-electron!%20https://github.com/maximegris/angular-electron%20%F0%9F%91%8D
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/maximegris/angular-electron.svg?style=social

```
file-management-frontend
├─ .angular
├─ .editorconfig
├─ .eslintignore
├─ .eslintrc.json
├─ .git
│  ├─ config
│  ├─ description
│  ├─ FETCH_HEAD
│  ├─ HEAD
│  ├─ hooks
│  │  ├─ applypatch-msg.sample
│  │  ├─ commit-msg.sample
│  │  ├─ fsmonitor-watchman.sample
│  │  ├─ post-update.sample
│  │  ├─ pre-applypatch.sample
│  │  ├─ pre-commit.sample
│  │  ├─ pre-merge-commit.sample
│  │  ├─ pre-push.sample
│  │  ├─ pre-rebase.sample
│  │  ├─ pre-receive.sample
│  │  ├─ prepare-commit-msg.sample
│  │  ├─ push-to-checkout.sample
│  │  ├─ sendemail-validate.sample
│  │  └─ update.sample
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  └─ main
│  │     └─ remotes
│  │        └─ origin
│  │           └─ HEAD
│  ├─ objects
│  │  ├─ info
│  │  └─ pack
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.idx
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.pack
│  │     └─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.rev
│  ├─ packed-refs
│  └─ refs
│     ├─ heads
│     │  └─ main
│     ├─ remotes
│     │  └─ origin
│     │     └─ HEAD
│     └─ tags
├─ .github
│  ├─ dependabot.yml
│  ├─ FUNDING.yml
│  ├─ ISSUE_TEMPLATE
│  │  ├─ bug_report.md
│  │  ├─ bug_report.yml
│  │  ├─ feature_request.md
│  │  └─ feature_request.yml
│  ├─ pull_request_template.md
│  ├─ stale.yml
│  └─ workflows
│     ├─ macos.yml
│     ├─ ubuntu.yml
│     └─ windows.yml
├─ .gitignore
├─ .node-version
├─ .npmrc
├─ .nx
│  └─ cache
│     └─ 18.3.4-nx.win32-x64-msvc.node
├─ angular.json
├─ angular.webpack.js
├─ app
│  ├─ main.ts
│  ├─ package-lock.json
│  └─ package.json
├─ CHANGELOG.md
├─ CODE_OF_CONDUCT.md
├─ e2e
│  ├─ main.spec.ts
│  └─ playwright.config.ts
├─ electron-builder.json
├─ file_structure.txt
├─ HOW_TO.md
├─ jest.config.js
├─ LICENSE.md
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ app
│  │  ├─ app-routing.module.ts
│  │  ├─ app.component.html
│  │  ├─ app.component.scss
│  │  ├─ app.component.spec.ts
│  │  ├─ app.component.ts
│  │  ├─ app.module.ts
│  │  ├─ core
│  │  │  ├─ core.module.ts
│  │  │  └─ services
│  │  │     ├─ electron
│  │  │     │  ├─ electron.service.spec.ts
│  │  │     │  └─ electron.service.ts
│  │  │     └─ index.ts
│  │  ├─ detail
│  │  │  ├─ detail-routing.module.ts
│  │  │  ├─ detail.component.html
│  │  │  ├─ detail.component.scss
│  │  │  ├─ detail.component.spec.ts
│  │  │  ├─ detail.component.ts
│  │  │  └─ detail.module.ts
│  │  ├─ home
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  └─ home.module.ts
│  │  └─ shared
│  │     ├─ components
│  │     │  ├─ index.ts
│  │     │  └─ page-not-found
│  │     │     ├─ page-not-found.component.html
│  │     │     ├─ page-not-found.component.scss
│  │     │     ├─ page-not-found.component.spec.ts
│  │     │     └─ page-not-found.component.ts
│  │     ├─ directives
│  │     │  ├─ index.ts
│  │     │  └─ webview
│  │     │     ├─ webview.directive.spec.ts
│  │     │     └─ webview.directive.ts
│  │     └─ shared.module.ts
│  ├─ assets
│  │  ├─ .gitkeep
│  │  ├─ background.jpg
│  │  ├─ i18n
│  │  └─ icons
│  │     ├─ electron.bmp
│  │     ├─ favicon.256x256.png
│  │     ├─ favicon.512x512.png
│  │     ├─ favicon.icns
│  │     ├─ favicon.ico
│  │     └─ favicon.png
│  ├─ environments
│  │  ├─ environment.dev.ts
│  │  ├─ environment.prod.ts
│  │  ├─ environment.ts
│  │  ├─ environment.web.prod.ts
│  │  └─ environment.web.ts
│  ├─ favicon.ico
│  ├─ index.html
│  ├─ main.ts
│  ├─ polyfills-test.ts
│  ├─ polyfills.ts
│  ├─ styles.scss
│  ├─ tsconfig.app.json
│  └─ tsconfig.spec.json
├─ tsconfig.json
├─ tsconfig.serve.json
└─ _config.yml

```
```
file-management-frontend
├─ .angular
├─ .editorconfig
├─ .eslintignore
├─ .eslintrc.json
├─ .git
│  ├─ config
│  ├─ description
│  ├─ FETCH_HEAD
│  ├─ HEAD
│  ├─ hooks
│  │  ├─ applypatch-msg.sample
│  │  ├─ commit-msg.sample
│  │  ├─ fsmonitor-watchman.sample
│  │  ├─ post-update.sample
│  │  ├─ pre-applypatch.sample
│  │  ├─ pre-commit.sample
│  │  ├─ pre-merge-commit.sample
│  │  ├─ pre-push.sample
│  │  ├─ pre-rebase.sample
│  │  ├─ pre-receive.sample
│  │  ├─ prepare-commit-msg.sample
│  │  ├─ push-to-checkout.sample
│  │  ├─ sendemail-validate.sample
│  │  └─ update.sample
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  └─ main
│  │     └─ remotes
│  │        └─ origin
│  │           └─ HEAD
│  ├─ objects
│  │  ├─ info
│  │  └─ pack
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.idx
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.pack
│  │     └─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.rev
│  ├─ packed-refs
│  └─ refs
│     ├─ heads
│     │  └─ main
│     ├─ remotes
│     │  └─ origin
│     │     └─ HEAD
│     └─ tags
├─ .github
│  ├─ dependabot.yml
│  ├─ FUNDING.yml
│  ├─ ISSUE_TEMPLATE
│  │  ├─ bug_report.md
│  │  ├─ bug_report.yml
│  │  ├─ feature_request.md
│  │  └─ feature_request.yml
│  ├─ pull_request_template.md
│  ├─ stale.yml
│  └─ workflows
│     ├─ macos.yml
│     ├─ ubuntu.yml
│     └─ windows.yml
├─ .gitignore
├─ .node-version
├─ .npmrc
├─ .nx
│  └─ cache
│     └─ 18.3.4-nx.win32-x64-msvc.node
├─ angular.json
├─ angular.webpack.js
├─ app
│  ├─ main.ts
│  ├─ package-lock.json
│  └─ package.json
├─ CHANGELOG.md
├─ CODE_OF_CONDUCT.md
├─ e2e
│  ├─ main.spec.ts
│  └─ playwright.config.ts
├─ electron-builder.json
├─ file_structure.txt
├─ HOW_TO.md
├─ jest.config.js
├─ LICENSE.md
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ app
│  │  ├─ app-routing.module.ts
│  │  ├─ app.component.html
│  │  ├─ app.component.scss
│  │  ├─ app.component.spec.ts
│  │  ├─ app.component.ts
│  │  ├─ app.module.ts
│  │  ├─ core
│  │  │  ├─ core.module.ts
│  │  │  └─ services
│  │  │     ├─ electron
│  │  │     │  ├─ electron.service.spec.ts
│  │  │     │  └─ electron.service.ts
│  │  │     └─ index.ts
│  │  ├─ detail
│  │  │  ├─ detail-routing.module.ts
│  │  │  ├─ detail.component.html
│  │  │  ├─ detail.component.scss
│  │  │  ├─ detail.component.spec.ts
│  │  │  ├─ detail.component.ts
│  │  │  └─ detail.module.ts
│  │  ├─ home
│  │  │  ├─ components
│  │  │  │  └─ file-list
│  │  │  │     ├─ file-list.component.html
│  │  │  │     ├─ file-list.component.scss
│  │  │  │     ├─ file-list.component.spec.ts
│  │  │  │     └─ file-list.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  └─ home.module.ts
│  │  └─ shared
│  │     ├─ components
│  │     │  ├─ index.ts
│  │     │  └─ page-not-found
│  │     │     ├─ page-not-found.component.html
│  │     │     ├─ page-not-found.component.scss
│  │     │     ├─ page-not-found.component.spec.ts
│  │     │     └─ page-not-found.component.ts
│  │     ├─ directives
│  │     │  ├─ index.ts
│  │     │  └─ webview
│  │     │     ├─ webview.directive.spec.ts
│  │     │     └─ webview.directive.ts
│  │     └─ shared.module.ts
│  ├─ assets
│  │  ├─ .gitkeep
│  │  ├─ background.jpg
│  │  ├─ i18n
│  │  └─ icons
│  │     ├─ electron.bmp
│  │     ├─ favicon.256x256.png
│  │     ├─ favicon.512x512.png
│  │     ├─ favicon.icns
│  │     ├─ favicon.ico
│  │     └─ favicon.png
│  ├─ environments
│  │  ├─ environment.dev.ts
│  │  ├─ environment.prod.ts
│  │  ├─ environment.ts
│  │  ├─ environment.web.prod.ts
│  │  └─ environment.web.ts
│  ├─ favicon.ico
│  ├─ index.html
│  ├─ main.ts
│  ├─ polyfills-test.ts
│  ├─ polyfills.ts
│  ├─ styles.scss
│  ├─ tsconfig.app.json
│  └─ tsconfig.spec.json
├─ tsconfig.json
├─ tsconfig.serve.json
└─ _config.yml

```
```
file-management-frontend
├─ .angular
├─ .editorconfig
├─ .eslintignore
├─ .eslintrc.json
├─ .git
│  ├─ config
│  ├─ description
│  ├─ FETCH_HEAD
│  ├─ HEAD
│  ├─ hooks
│  │  ├─ applypatch-msg.sample
│  │  ├─ commit-msg.sample
│  │  ├─ fsmonitor-watchman.sample
│  │  ├─ post-update.sample
│  │  ├─ pre-applypatch.sample
│  │  ├─ pre-commit.sample
│  │  ├─ pre-merge-commit.sample
│  │  ├─ pre-push.sample
│  │  ├─ pre-rebase.sample
│  │  ├─ pre-receive.sample
│  │  ├─ prepare-commit-msg.sample
│  │  ├─ push-to-checkout.sample
│  │  ├─ sendemail-validate.sample
│  │  └─ update.sample
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  └─ main
│  │     └─ remotes
│  │        └─ origin
│  │           └─ HEAD
│  ├─ objects
│  │  ├─ info
│  │  └─ pack
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.idx
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.pack
│  │     └─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.rev
│  ├─ packed-refs
│  └─ refs
│     ├─ heads
│     │  └─ main
│     ├─ remotes
│     │  └─ origin
│     │     └─ HEAD
│     └─ tags
├─ .github
│  ├─ dependabot.yml
│  ├─ FUNDING.yml
│  ├─ ISSUE_TEMPLATE
│  │  ├─ bug_report.md
│  │  ├─ bug_report.yml
│  │  ├─ feature_request.md
│  │  └─ feature_request.yml
│  ├─ pull_request_template.md
│  ├─ stale.yml
│  └─ workflows
│     ├─ macos.yml
│     ├─ ubuntu.yml
│     └─ windows.yml
├─ .gitignore
├─ .node-version
├─ .npmrc
├─ .nx
│  └─ cache
│     └─ 18.3.4-nx.win32-x64-msvc.node
├─ angular.json
├─ angular.webpack.js
├─ app
│  ├─ main.ts
│  ├─ package-lock.json
│  └─ package.json
├─ CHANGELOG.md
├─ CODE_OF_CONDUCT.md
├─ e2e
│  ├─ main.spec.ts
│  └─ playwright.config.ts
├─ electron-builder.json
├─ file_structure.txt
├─ HOW_TO.md
├─ jest.config.js
├─ LICENSE.md
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ app
│  │  ├─ app-routing.module.ts
│  │  ├─ app.component.html
│  │  ├─ app.component.scss
│  │  ├─ app.component.spec.ts
│  │  ├─ app.component.ts
│  │  ├─ app.module.ts
│  │  ├─ core
│  │  │  ├─ core.module.ts
│  │  │  └─ services
│  │  │     ├─ electron
│  │  │     │  ├─ electron.service.spec.ts
│  │  │     │  └─ electron.service.ts
│  │  │     └─ index.ts
│  │  ├─ detail
│  │  │  ├─ detail-routing.module.ts
│  │  │  ├─ detail.component.html
│  │  │  ├─ detail.component.scss
│  │  │  ├─ detail.component.spec.ts
│  │  │  ├─ detail.component.ts
│  │  │  └─ detail.module.ts
│  │  ├─ home
│  │  │  ├─ components
│  │  │  │  └─ file-list
│  │  │  │     ├─ file-list.component.html
│  │  │  │     ├─ file-list.component.scss
│  │  │  │     ├─ file-list.component.spec.ts
│  │  │  │     └─ file-list.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  └─ home.module.ts
│  │  └─ shared
│  │     ├─ components
│  │     │  ├─ index.ts
│  │     │  └─ page-not-found
│  │     │     ├─ page-not-found.component.html
│  │     │     ├─ page-not-found.component.scss
│  │     │     ├─ page-not-found.component.spec.ts
│  │     │     └─ page-not-found.component.ts
│  │     ├─ directives
│  │     │  ├─ index.ts
│  │     │  └─ webview
│  │     │     ├─ webview.directive.spec.ts
│  │     │     └─ webview.directive.ts
│  │     └─ shared.module.ts
│  ├─ assets
│  │  ├─ .gitkeep
│  │  ├─ background.jpg
│  │  ├─ i18n
│  │  └─ icons
│  │     ├─ electron.bmp
│  │     ├─ favicon.256x256.png
│  │     ├─ favicon.512x512.png
│  │     ├─ favicon.icns
│  │     ├─ favicon.ico
│  │     └─ favicon.png
│  ├─ environments
│  │  ├─ environment.dev.ts
│  │  ├─ environment.prod.ts
│  │  ├─ environment.ts
│  │  ├─ environment.web.prod.ts
│  │  └─ environment.web.ts
│  ├─ favicon.ico
│  ├─ index.html
│  ├─ main.ts
│  ├─ polyfills-test.ts
│  ├─ polyfills.ts
│  ├─ styles.scss
│  ├─ tsconfig.app.json
│  └─ tsconfig.spec.json
├─ tsconfig.json
├─ tsconfig.serve.json
└─ _config.yml

```
```
file-management-frontend
├─ .angular
├─ .editorconfig
├─ .eslintignore
├─ .eslintrc.json
├─ .git
│  ├─ COMMIT_EDITMSG
│  ├─ config
│  ├─ description
│  ├─ FETCH_HEAD
│  ├─ HEAD
│  ├─ hooks
│  │  ├─ applypatch-msg.sample
│  │  ├─ commit-msg.sample
│  │  ├─ fsmonitor-watchman.sample
│  │  ├─ post-update.sample
│  │  ├─ pre-applypatch.sample
│  │  ├─ pre-commit.sample
│  │  ├─ pre-merge-commit.sample
│  │  ├─ pre-push.sample
│  │  ├─ pre-rebase.sample
│  │  ├─ pre-receive.sample
│  │  ├─ prepare-commit-msg.sample
│  │  ├─ push-to-checkout.sample
│  │  ├─ sendemail-validate.sample
│  │  └─ update.sample
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  └─ main
│  │     └─ remotes
│  │        ├─ origin
│  │        │  ├─ angular10
│  │        │  ├─ angular11
│  │        │  ├─ angular12
│  │        │  ├─ angular13
│  │        │  ├─ angular14
│  │        │  ├─ angular16
│  │        │  ├─ angular4
│  │        │  ├─ angular5
│  │        │  ├─ angular6
│  │        │  ├─ angular7
│  │        │  ├─ angular8
│  │        │  ├─ angular9
│  │        │  ├─ dependabot
│  │        │  │  └─ npm_and_yarn
│  │        │  │     ├─ braces-3.0.3
│  │        │  │     ├─ multi-bbc963d221
│  │        │  │     └─ ws-8.17.1
│  │        │  ├─ feature
│  │        │  │  └─ migrate-to-esbuild
│  │        │  ├─ main
│  │        │  └─ misc
│  │        │     └─ replace-karma-with-jest
│  │        └─ upstream
│  │           ├─ angular10
│  │           ├─ angular11
│  │           ├─ angular12
│  │           ├─ angular13
│  │           ├─ angular14
│  │           ├─ angular16
│  │           ├─ angular4
│  │           ├─ angular5
│  │           ├─ angular6
│  │           ├─ angular7
│  │           ├─ angular8
│  │           ├─ angular9
│  │           ├─ dependabot
│  │           │  └─ npm_and_yarn
│  │           │     ├─ braces-3.0.3
│  │           │     ├─ multi-bbc963d221
│  │           │     └─ ws-8.17.1
│  │           ├─ feature
│  │           │  └─ migrate-to-esbuild
│  │           ├─ HEAD
│  │           ├─ main
│  │           └─ misc
│  │              └─ replace-karma-with-jest
│  ├─ objects
│  │  ├─ 05
│  │  │  └─ b42875f5c06cbe0064bbff305b26709484053f
│  │  ├─ 07
│  │  │  └─ ce58d4dec9bdeed43c36d1a9254108d65b3ee9
│  │  ├─ 0d
│  │  │  ├─ 8751cc6a0b8e982ab13921b09ed56fd75c7fda
│  │  │  └─ 9a8050c6d0decb7b6d7cfbad28a51a05022b83
│  │  ├─ 0e
│  │  │  └─ 9b7348ae4326a6341050660541e1b45aa8a5a9
│  │  ├─ 10
│  │  │  ├─ 7ab3c34c941559f4fafc9f91493632c99371ab
│  │  │  └─ 9a14bef759f7b15a2c08a00b7bf54b69d9d2ad
│  │  ├─ 13
│  │  │  └─ 2b883150a103a975b50a9246ae130bedc27c6a
│  │  ├─ 15
│  │  │  └─ e979a6fc7039e0ac3b1c7d016fae7dc452392e
│  │  ├─ 1c
│  │  │  ├─ 094a6864cd1d4f48501e28f765627c51df647a
│  │  │  └─ b7677f8abb1962f78604e2ea6951d54352a8f7
│  │  ├─ 1d
│  │  │  └─ 03942b48f9210fe6101b9fb48c0bac0bf2cf29
│  │  ├─ 1e
│  │  │  └─ af8346d465ee446d4bad907881535a16d3ca52
│  │  ├─ 2f
│  │  │  ├─ ee159df0262e53b5961a5dedd3b7e67990681a
│  │  │  └─ ffa127ca70a56215ce19e8593c86772379dffd
│  │  ├─ 34
│  │  │  ├─ 1e947fb5aee66aca85f130307c129669b4a4b5
│  │  │  └─ b441d01a924d32ea4f603f5e8766781c579389
│  │  ├─ 35
│  │  │  └─ c82e11403727c2821efa0a994297d76dba73a6
│  │  ├─ 3d
│  │  │  └─ f939063d1f2f80d095ee126789dfa9fec31084
│  │  ├─ 40
│  │  │  ├─ 6864f5f19b345e588b6352c6cf8345f43ffd36
│  │  │  └─ b66f2eddde4ae7a44301684d10ea5be278bbd5
│  │  ├─ 42
│  │  │  └─ 3c152754e40e325977ea530946ceaee625dd29
│  │  ├─ 45
│  │  │  └─ 58e39c28f25c68bc6dcace958a2d9d57b75cf8
│  │  ├─ 48
│  │  │  └─ eb1fe431ec7ebbf57911f4f5ae44fabd441564
│  │  ├─ 49
│  │  │  └─ 81b201da9f5749c3cf38159f58b88cec50b93d
│  │  ├─ 4f
│  │  │  └─ 1b8e57d494697d1718fb7be64d9e7137df1d9a
│  │  ├─ 53
│  │  │  └─ ad8cb718839b23041a7b8b0ce7ac7280326230
│  │  ├─ 54
│  │  │  └─ 7ccf93f9b3fd666ca2f2182a43b4380ceee698
│  │  ├─ 57
│  │  │  └─ 0184df6b80e7de9d3c695bcd539ba95eb6a461
│  │  ├─ 58
│  │  │  └─ 91e4c538dddd60ff8b27497b25f38649073e43
│  │  ├─ 5a
│  │  │  └─ 0e84424b4cf02c83204df68b742272b6084487
│  │  ├─ 65
│  │  │  └─ 96fa1b0478594a52eb1767a590675435e2db6a
│  │  ├─ 66
│  │  │  └─ 48dec243feb01445519b94b1b0649f48abd05d
│  │  ├─ 68
│  │  │  └─ 5cbb740e44d36ca7e1a619d3aba11b6ad85e69
│  │  ├─ 69
│  │  │  └─ ced70227330b3c7b1915aed2e3c6cf23eebd4d
│  │  ├─ 70
│  │  │  └─ ac92f0145dfece0ed396931f9faa8f476b86bb
│  │  ├─ 74
│  │  │  └─ cb977aca0ead9dbf77738f0fdc16aaf8e93204
│  │  ├─ 76
│  │  │  ├─ da4a8170a978f89364b3e6c6034855fd751aee
│  │  │  └─ f5f76f8d4cabcee8ad4946ead97c438da786d4
│  │  ├─ 7a
│  │  │  ├─ 2258823ede9f81daedeffd594a1bed3b287154
│  │  │  └─ 31b7c652d6674e89185d18b1245e56328a7af0
│  │  ├─ 7e
│  │  │  ├─ 4876066cd1617bfe8d9b6f6dff58126b765fde
│  │  │  └─ 48eaeec7199bcbfc9a332d9a66a40bec4adaf4
│  │  ├─ 7f
│  │  │  └─ 24d0535524c421fa7bf10cc77d5581a1990af3
│  │  ├─ 80
│  │  │  └─ ddca53b664daa4a021b2a1ab6e5186e55d1218
│  │  ├─ 82
│  │  │  └─ 357a2ed0df380fcc6be1471e741f35151a74ba
│  │  ├─ 83
│  │  │  ├─ 15018b78ae505cc433cb97ca3a167c8f775dad
│  │  │  └─ b26936269e42bdf7de59510eb4ac5c2dfcc0f0
│  │  ├─ 84
│  │  │  └─ 2ce87050d3b7f87a9051c24a6545ae1632d0a1
│  │  ├─ 89
│  │  │  └─ 7a8247e917008240cf802d3b726cfe765a96ad
│  │  ├─ 8b
│  │  │  └─ 69bd3f03c8ec33b3a5933b2e3f1147625d4fc3
│  │  ├─ 8c
│  │  │  ├─ 75aaf343c574a758b36e1ca987b52a6b75d094
│  │  │  ├─ c529e828f4c37fb16c3d9b673b2c2b74280617
│  │  │  └─ da7581f90229889f9120bd4535872678ac5aa1
│  │  ├─ 94
│  │  │  └─ 7d23e315080fd1275d161ffd1b20350a7c2d16
│  │  ├─ 95
│  │  │  └─ 33a2271768a71b4e94edf64c2f03991f7a0cd7
│  │  ├─ 9a
│  │  │  └─ 5cfafb29db4f947ecc21390a53505797922d16
│  │  ├─ 9d
│  │  │  └─ 1876b31c1a9aeefa52aa5034219411a004f9ed
│  │  ├─ ab
│  │  │  └─ fa9e664e7f492b1d469cf2a5faa6dc561a0fe9
│  │  ├─ b2
│  │  │  └─ 6895682404ac220dd5e4175e833103628edc1c
│  │  ├─ ba
│  │  │  └─ e164844fea9fef7283fd374750ecd7a2175148
│  │  ├─ be
│  │  │  └─ e9cea393a85d7a4db4a292b84c89330af86138
│  │  ├─ c0
│  │  │  └─ 6f63ef871a5a3d35240549146bea9e637776f3
│  │  ├─ c2
│  │  │  └─ afcdce0fba285ce7853568d1d793ff12987429
│  │  ├─ c5
│  │  │  └─ ba50e87e6a2913b776f367eec364ab59c186f4
│  │  ├─ c8
│  │  │  └─ cac84d0488d03281b6ac5df66e685dfa37904e
│  │  ├─ cc
│  │  │  └─ 6878e8d76f55f86e4d42389a65b34ff2a11692
│  │  ├─ cd
│  │  │  └─ be04265509475527cb6a32e36d1d44d0dce708
│  │  ├─ d6
│  │  │  ├─ 63325dcd2f2ec2dfcfa3261e3be1b92afda750
│  │  │  └─ 8b96d933552637d824dd1f20026d997664e248
│  │  ├─ d7
│  │  │  └─ 630660fb0149b8b117ef116e5b7b4441ad6599
│  │  ├─ d9
│  │  │  └─ 89abb8d2498ee78adc6f3cea86e2cd8fd099d8
│  │  ├─ de
│  │  │  └─ 28bbad30101afafa942b996b8a6f256b406d02
│  │  ├─ e0
│  │  │  └─ 8ada3065e474b2de3efc177ac3eea3075a29a9
│  │  ├─ ea
│  │  │  └─ 1f71d48054576cb0de70354643582a9500f14f
│  │  ├─ ec
│  │  │  └─ 3aa5f99e7e3d14c209af75d372c47281e5b0bb
│  │  ├─ ee
│  │  │  └─ f5d2a1a561900aa7f42c3a7951f97a92938807
│  │  ├─ f0
│  │  │  └─ bebceeaf3639544ff7a84b3014c332232ecd6c
│  │  ├─ f5
│  │  │  └─ 5bfd30bdc748321b05400e9ce10d1e0dfbe6b3
│  │  ├─ f6
│  │  │  └─ fc247456b420714c7feb9fcbc32418a6d8734e
│  │  ├─ f8
│  │  │  ├─ 8388a5a2c13e35f467242c502d8e40b0ed5984
│  │  │  └─ ee2136de291c073249e786b7776fab58059a11
│  │  ├─ info
│  │  └─ pack
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.idx
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.pack
│  │     └─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.rev
│  ├─ ORIG_HEAD
│  ├─ packed-refs
│  └─ refs
│     ├─ heads
│     │  └─ main
│     ├─ remotes
│     │  ├─ origin
│     │  │  ├─ angular10
│     │  │  ├─ angular11
│     │  │  ├─ angular12
│     │  │  ├─ angular13
│     │  │  ├─ angular14
│     │  │  ├─ angular16
│     │  │  ├─ angular4
│     │  │  ├─ angular5
│     │  │  ├─ angular6
│     │  │  ├─ angular7
│     │  │  ├─ angular8
│     │  │  ├─ angular9
│     │  │  ├─ dependabot
│     │  │  │  └─ npm_and_yarn
│     │  │  │     ├─ braces-3.0.3
│     │  │  │     ├─ multi-bbc963d221
│     │  │  │     └─ ws-8.17.1
│     │  │  ├─ feature
│     │  │  │  └─ migrate-to-esbuild
│     │  │  ├─ main
│     │  │  └─ misc
│     │  │     └─ replace-karma-with-jest
│     │  └─ upstream
│     │     ├─ angular10
│     │     ├─ angular11
│     │     ├─ angular12
│     │     ├─ angular13
│     │     ├─ angular14
│     │     ├─ angular16
│     │     ├─ angular4
│     │     ├─ angular5
│     │     ├─ angular6
│     │     ├─ angular7
│     │     ├─ angular8
│     │     ├─ angular9
│     │     ├─ dependabot
│     │     │  └─ npm_and_yarn
│     │     │     ├─ braces-3.0.3
│     │     │     ├─ multi-bbc963d221
│     │     │     └─ ws-8.17.1
│     │     ├─ feature
│     │     │  └─ migrate-to-esbuild
│     │     ├─ HEAD
│     │     ├─ main
│     │     └─ misc
│     │        └─ replace-karma-with-jest
│     └─ tags
├─ .github
│  ├─ dependabot.yml
│  ├─ FUNDING.yml
│  ├─ ISSUE_TEMPLATE
│  │  ├─ bug_report.md
│  │  ├─ bug_report.yml
│  │  ├─ feature_request.md
│  │  └─ feature_request.yml
│  ├─ pull_request_template.md
│  ├─ stale.yml
│  └─ workflows
│     ├─ macos.yml
│     ├─ ubuntu.yml
│     └─ windows.yml
├─ .gitignore
├─ .node-version
├─ .npmrc
├─ .nx
│  └─ cache
│     └─ 18.3.4-nx.win32-x64-msvc.node
├─ angular.json
├─ angular.webpack.js
├─ app
│  ├─ main.ts
│  ├─ package-lock.json
│  └─ package.json
├─ CHANGELOG.md
├─ CODE_OF_CONDUCT.md
├─ e2e
│  ├─ main.spec.ts
│  └─ playwright.config.ts
├─ electron-builder.json
├─ file_structure.txt
├─ HOW_TO.md
├─ jest.config.js
├─ LICENSE.md
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ app
│  │  ├─ app-routing.module.ts
│  │  ├─ app.component.html
│  │  ├─ app.component.scss
│  │  ├─ app.component.spec.ts
│  │  ├─ app.component.ts
│  │  ├─ app.module.ts
│  │  ├─ core
│  │  │  ├─ core.module.ts
│  │  │  └─ services
│  │  │     ├─ electron
│  │  │     │  ├─ electron.service.spec.ts
│  │  │     │  └─ electron.service.ts
│  │  │     └─ index.ts
│  │  ├─ detail
│  │  │  ├─ detail-routing.module.ts
│  │  │  ├─ detail.component.html
│  │  │  ├─ detail.component.scss
│  │  │  ├─ detail.component.spec.ts
│  │  │  ├─ detail.component.ts
│  │  │  └─ detail.module.ts
│  │  ├─ home
│  │  │  ├─ components
│  │  │  │  ├─ explorer-toolbar
│  │  │  │  │  ├─ explorer-toolbar.component.html
│  │  │  │  │  ├─ explorer-toolbar.component.scss
│  │  │  │  │  ├─ explorer-toolbar.component.spec.ts
│  │  │  │  │  └─ explorer-toolbar.component.ts
│  │  │  │  └─ file-list
│  │  │  │     ├─ file-list.component.html
│  │  │  │     ├─ file-list.component.scss
│  │  │  │     ├─ file-list.component.spec.ts
│  │  │  │     └─ file-list.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     └─ scroll-state.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences
│  │  │  │  ├─ preferences.component.html
│  │  │  │  ├─ preferences.component.scss
│  │  │  │  ├─ preferences.component.spec.ts
│  │  │  │  └─ preferences.component.ts
│  │  │  ├─ preferences-routing.module.ts
│  │  │  └─ preferences.module.ts
│  │  └─ shared
│  │     ├─ components
│  │     │  ├─ index.ts
│  │     │  └─ page-not-found
│  │     │     ├─ page-not-found.component.html
│  │     │     ├─ page-not-found.component.scss
│  │     │     ├─ page-not-found.component.spec.ts
│  │     │     └─ page-not-found.component.ts
│  │     ├─ directives
│  │     │  ├─ index.ts
│  │     │  └─ webview
│  │     │     ├─ webview.directive.spec.ts
│  │     │     └─ webview.directive.ts
│  │     └─ shared.module.ts
│  ├─ assets
│  │  ├─ .gitkeep
│  │  ├─ background.jpg
│  │  ├─ i18n
│  │  └─ icons
│  │     ├─ electron.bmp
│  │     ├─ favicon.256x256.png
│  │     ├─ favicon.512x512.png
│  │     ├─ favicon.icns
│  │     ├─ favicon.ico
│  │     └─ favicon.png
│  ├─ environments
│  │  ├─ environment.dev.ts
│  │  ├─ environment.prod.ts
│  │  ├─ environment.ts
│  │  ├─ environment.web.prod.ts
│  │  └─ environment.web.ts
│  ├─ favicon.ico
│  ├─ index.html
│  ├─ main.ts
│  ├─ polyfills-test.ts
│  ├─ polyfills.ts
│  ├─ styles.scss
│  ├─ tsconfig.app.json
│  └─ tsconfig.spec.json
├─ tsconfig.json
├─ tsconfig.serve.json
└─ _config.yml

```
```
file-management-frontend
├─ .angular
├─ .editorconfig
├─ .eslintignore
├─ .eslintrc.json
├─ .git
│  ├─ COMMIT_EDITMSG
│  ├─ config
│  ├─ description
│  ├─ FETCH_HEAD
│  ├─ HEAD
│  ├─ hooks
│  │  ├─ applypatch-msg.sample
│  │  ├─ commit-msg.sample
│  │  ├─ fsmonitor-watchman.sample
│  │  ├─ post-update.sample
│  │  ├─ pre-applypatch.sample
│  │  ├─ pre-commit.sample
│  │  ├─ pre-merge-commit.sample
│  │  ├─ pre-push.sample
│  │  ├─ pre-rebase.sample
│  │  ├─ pre-receive.sample
│  │  ├─ prepare-commit-msg.sample
│  │  ├─ push-to-checkout.sample
│  │  ├─ sendemail-validate.sample
│  │  └─ update.sample
│  ├─ index
│  ├─ info
│  │  └─ exclude
│  ├─ logs
│  │  ├─ HEAD
│  │  └─ refs
│  │     ├─ heads
│  │     │  └─ main
│  │     └─ remotes
│  │        ├─ origin
│  │        │  ├─ angular10
│  │        │  ├─ angular11
│  │        │  ├─ angular12
│  │        │  ├─ angular13
│  │        │  ├─ angular14
│  │        │  ├─ angular16
│  │        │  ├─ angular4
│  │        │  ├─ angular5
│  │        │  ├─ angular6
│  │        │  ├─ angular7
│  │        │  ├─ angular8
│  │        │  ├─ angular9
│  │        │  ├─ dependabot
│  │        │  │  └─ npm_and_yarn
│  │        │  │     ├─ braces-3.0.3
│  │        │  │     ├─ multi-bbc963d221
│  │        │  │     └─ ws-8.17.1
│  │        │  ├─ feature
│  │        │  │  └─ migrate-to-esbuild
│  │        │  ├─ main
│  │        │  └─ misc
│  │        │     └─ replace-karma-with-jest
│  │        └─ upstream
│  │           ├─ angular10
│  │           ├─ angular11
│  │           ├─ angular12
│  │           ├─ angular13
│  │           ├─ angular14
│  │           ├─ angular16
│  │           ├─ angular4
│  │           ├─ angular5
│  │           ├─ angular6
│  │           ├─ angular7
│  │           ├─ angular8
│  │           ├─ angular9
│  │           ├─ dependabot
│  │           │  └─ npm_and_yarn
│  │           │     ├─ braces-3.0.3
│  │           │     ├─ multi-bbc963d221
│  │           │     └─ ws-8.17.1
│  │           ├─ feature
│  │           │  └─ migrate-to-esbuild
│  │           ├─ HEAD
│  │           ├─ main
│  │           └─ misc
│  │              └─ replace-karma-with-jest
│  ├─ objects
│  │  ├─ 03
│  │  │  └─ a810dd024a216ebf98cb0ad2ceac8045050a93
│  │  ├─ 05
│  │  │  ├─ 2fe4618df43e198092ace9a30bbbe7384be606
│  │  │  └─ b42875f5c06cbe0064bbff305b26709484053f
│  │  ├─ 07
│  │  │  └─ ce58d4dec9bdeed43c36d1a9254108d65b3ee9
│  │  ├─ 08
│  │  │  └─ 00bc6eef44cb1fe2aa09022210eb9186288130
│  │  ├─ 0d
│  │  │  ├─ 8751cc6a0b8e982ab13921b09ed56fd75c7fda
│  │  │  └─ 9a8050c6d0decb7b6d7cfbad28a51a05022b83
│  │  ├─ 0e
│  │  │  └─ 9b7348ae4326a6341050660541e1b45aa8a5a9
│  │  ├─ 10
│  │  │  ├─ 4282a467f731d5c8e61e220f23f8899010e220
│  │  │  ├─ 7ab3c34c941559f4fafc9f91493632c99371ab
│  │  │  └─ 9a14bef759f7b15a2c08a00b7bf54b69d9d2ad
│  │  ├─ 13
│  │  │  └─ 2b883150a103a975b50a9246ae130bedc27c6a
│  │  ├─ 14
│  │  │  └─ 9b2fe519660adc8ad91aa64f9f009ca6296741
│  │  ├─ 15
│  │  │  └─ e979a6fc7039e0ac3b1c7d016fae7dc452392e
│  │  ├─ 1c
│  │  │  ├─ 094a6864cd1d4f48501e28f765627c51df647a
│  │  │  └─ b7677f8abb1962f78604e2ea6951d54352a8f7
│  │  ├─ 1d
│  │  │  └─ 03942b48f9210fe6101b9fb48c0bac0bf2cf29
│  │  ├─ 1e
│  │  │  └─ af8346d465ee446d4bad907881535a16d3ca52
│  │  ├─ 2f
│  │  │  ├─ ee159df0262e53b5961a5dedd3b7e67990681a
│  │  │  └─ ffa127ca70a56215ce19e8593c86772379dffd
│  │  ├─ 34
│  │  │  ├─ 1e947fb5aee66aca85f130307c129669b4a4b5
│  │  │  └─ b441d01a924d32ea4f603f5e8766781c579389
│  │  ├─ 35
│  │  │  └─ c82e11403727c2821efa0a994297d76dba73a6
│  │  ├─ 3c
│  │  │  └─ d5edd0ed545d0861a3abd6c3faf62b9e4a962a
│  │  ├─ 3d
│  │  │  ├─ 4aa7f214d7ec00dc0eadd23b05dec9dbcb1ac2
│  │  │  └─ f939063d1f2f80d095ee126789dfa9fec31084
│  │  ├─ 40
│  │  │  ├─ 6864f5f19b345e588b6352c6cf8345f43ffd36
│  │  │  └─ b66f2eddde4ae7a44301684d10ea5be278bbd5
│  │  ├─ 42
│  │  │  └─ 3c152754e40e325977ea530946ceaee625dd29
│  │  ├─ 45
│  │  │  └─ 58e39c28f25c68bc6dcace958a2d9d57b75cf8
│  │  ├─ 48
│  │  │  └─ eb1fe431ec7ebbf57911f4f5ae44fabd441564
│  │  ├─ 49
│  │  │  └─ 81b201da9f5749c3cf38159f58b88cec50b93d
│  │  ├─ 4d
│  │  │  └─ 6dd1b27f400e8b4938d162f6f3000c044472d1
│  │  ├─ 4f
│  │  │  └─ 1b8e57d494697d1718fb7be64d9e7137df1d9a
│  │  ├─ 53
│  │  │  └─ ad8cb718839b23041a7b8b0ce7ac7280326230
│  │  ├─ 54
│  │  │  └─ 7ccf93f9b3fd666ca2f2182a43b4380ceee698
│  │  ├─ 57
│  │  │  └─ 0184df6b80e7de9d3c695bcd539ba95eb6a461
│  │  ├─ 58
│  │  │  ├─ 005f24498bab9f12a8411c6cdc53e36fae097b
│  │  │  └─ 91e4c538dddd60ff8b27497b25f38649073e43
│  │  ├─ 5a
│  │  │  └─ 0e84424b4cf02c83204df68b742272b6084487
│  │  ├─ 65
│  │  │  └─ 96fa1b0478594a52eb1767a590675435e2db6a
│  │  ├─ 66
│  │  │  └─ 48dec243feb01445519b94b1b0649f48abd05d
│  │  ├─ 68
│  │  │  └─ 5cbb740e44d36ca7e1a619d3aba11b6ad85e69
│  │  ├─ 69
│  │  │  └─ ced70227330b3c7b1915aed2e3c6cf23eebd4d
│  │  ├─ 6a
│  │  │  └─ 06806b3b026e972b64588eb64889a37b73ae0a
│  │  ├─ 70
│  │  │  └─ ac92f0145dfece0ed396931f9faa8f476b86bb
│  │  ├─ 74
│  │  │  ├─ a1d0ea2b8813e9a433e211a1d839e3a78adeb3
│  │  │  └─ cb977aca0ead9dbf77738f0fdc16aaf8e93204
│  │  ├─ 75
│  │  │  └─ 4cddb5833ef9a1f6cdde5dff64dc8795a5de9a
│  │  ├─ 76
│  │  │  ├─ 43c5d30b303fe8ec087d56315198c18bd8ebca
│  │  │  ├─ da4a8170a978f89364b3e6c6034855fd751aee
│  │  │  └─ f5f76f8d4cabcee8ad4946ead97c438da786d4
│  │  ├─ 7a
│  │  │  ├─ 2258823ede9f81daedeffd594a1bed3b287154
│  │  │  ├─ 31b7c652d6674e89185d18b1245e56328a7af0
│  │  │  └─ fae4f029cdcff2f8ae68d9ff7bdcddedb0b75b
│  │  ├─ 7e
│  │  │  ├─ 4876066cd1617bfe8d9b6f6dff58126b765fde
│  │  │  └─ 48eaeec7199bcbfc9a332d9a66a40bec4adaf4
│  │  ├─ 7f
│  │  │  └─ 24d0535524c421fa7bf10cc77d5581a1990af3
│  │  ├─ 80
│  │  │  └─ ddca53b664daa4a021b2a1ab6e5186e55d1218
│  │  ├─ 82
│  │  │  └─ 357a2ed0df380fcc6be1471e741f35151a74ba
│  │  ├─ 83
│  │  │  ├─ 15018b78ae505cc433cb97ca3a167c8f775dad
│  │  │  └─ b26936269e42bdf7de59510eb4ac5c2dfcc0f0
│  │  ├─ 84
│  │  │  └─ 2ce87050d3b7f87a9051c24a6545ae1632d0a1
│  │  ├─ 88
│  │  │  └─ 78e547a7984ed8b4aac1fe1a023e070e6489a0
│  │  ├─ 89
│  │  │  └─ 7a8247e917008240cf802d3b726cfe765a96ad
│  │  ├─ 8b
│  │  │  └─ 69bd3f03c8ec33b3a5933b2e3f1147625d4fc3
│  │  ├─ 8c
│  │  │  ├─ 75aaf343c574a758b36e1ca987b52a6b75d094
│  │  │  ├─ c529e828f4c37fb16c3d9b673b2c2b74280617
│  │  │  └─ da7581f90229889f9120bd4535872678ac5aa1
│  │  ├─ 94
│  │  │  └─ 7d23e315080fd1275d161ffd1b20350a7c2d16
│  │  ├─ 95
│  │  │  └─ 33a2271768a71b4e94edf64c2f03991f7a0cd7
│  │  ├─ 97
│  │  │  └─ 6954bcaadb2e55fb2990111a1429489ef0f52f
│  │  ├─ 98
│  │  │  └─ dd829b84779085f25e1db18b08d10b0f0f9bd5
│  │  ├─ 99
│  │  │  └─ 291c17180656dd48207bb10b4f9917998d4070
│  │  ├─ 9a
│  │  │  └─ 5cfafb29db4f947ecc21390a53505797922d16
│  │  ├─ 9d
│  │  │  └─ 1876b31c1a9aeefa52aa5034219411a004f9ed
│  │  ├─ 9f
│  │  │  └─ 7307ad2e98bda10a010905ca797d0a95fa8e5c
│  │  ├─ a9
│  │  │  └─ 23a594cefe4241ba142f16f54578bf9a81545b
│  │  ├─ ab
│  │  │  └─ fa9e664e7f492b1d469cf2a5faa6dc561a0fe9
│  │  ├─ b2
│  │  │  └─ 6895682404ac220dd5e4175e833103628edc1c
│  │  ├─ b6
│  │  │  └─ 17825ffa45aa64ec05fc71fa73507eb91f6a12
│  │  ├─ ba
│  │  │  └─ e164844fea9fef7283fd374750ecd7a2175148
│  │  ├─ be
│  │  │  └─ e9cea393a85d7a4db4a292b84c89330af86138
│  │  ├─ c0
│  │  │  └─ 6f63ef871a5a3d35240549146bea9e637776f3
│  │  ├─ c2
│  │  │  └─ afcdce0fba285ce7853568d1d793ff12987429
│  │  ├─ c5
│  │  │  └─ ba50e87e6a2913b776f367eec364ab59c186f4
│  │  ├─ c8
│  │  │  └─ cac84d0488d03281b6ac5df66e685dfa37904e
│  │  ├─ c9
│  │  │  └─ 18aed7d4d70b0f416534e9db548e69db42c78a
│  │  ├─ cc
│  │  │  └─ 6878e8d76f55f86e4d42389a65b34ff2a11692
│  │  ├─ cd
│  │  │  └─ be04265509475527cb6a32e36d1d44d0dce708
│  │  ├─ ce
│  │  │  └─ 414165181422b2d942a518d5ed082512e499dd
│  │  ├─ d6
│  │  │  ├─ 63325dcd2f2ec2dfcfa3261e3be1b92afda750
│  │  │  └─ 8b96d933552637d824dd1f20026d997664e248
│  │  ├─ d7
│  │  │  └─ 630660fb0149b8b117ef116e5b7b4441ad6599
│  │  ├─ d9
│  │  │  ├─ 89abb8d2498ee78adc6f3cea86e2cd8fd099d8
│  │  │  └─ cea4123914c6a0d5e665d1ee4dfc5e37a604f4
│  │  ├─ de
│  │  │  ├─ 28bbad30101afafa942b996b8a6f256b406d02
│  │  │  └─ cbd2ea30414689becb0021ddaee16f1943d91d
│  │  ├─ e0
│  │  │  └─ 8ada3065e474b2de3efc177ac3eea3075a29a9
│  │  ├─ ea
│  │  │  ├─ 1f71d48054576cb0de70354643582a9500f14f
│  │  │  └─ 6d4b4b04880ba1505a82f9c7643e3eafe936b7
│  │  ├─ eb
│  │  │  └─ 7fbc049c77f963df708e7622fa2543b956307f
│  │  ├─ ec
│  │  │  └─ 3aa5f99e7e3d14c209af75d372c47281e5b0bb
│  │  ├─ ee
│  │  │  └─ f5d2a1a561900aa7f42c3a7951f97a92938807
│  │  ├─ f0
│  │  │  └─ bebceeaf3639544ff7a84b3014c332232ecd6c
│  │  ├─ f1
│  │  │  └─ 9b5643106619225420b2e889d97d40f7e86242
│  │  ├─ f5
│  │  │  └─ 5bfd30bdc748321b05400e9ce10d1e0dfbe6b3
│  │  ├─ f6
│  │  │  ├─ cbc46fa0025ca8bae12a9cc2193153d67d6ee6
│  │  │  └─ fc247456b420714c7feb9fcbc32418a6d8734e
│  │  ├─ f8
│  │  │  ├─ 8388a5a2c13e35f467242c502d8e40b0ed5984
│  │  │  └─ ee2136de291c073249e786b7776fab58059a11
│  │  ├─ f9
│  │  │  └─ 994037c1a6313f45dcafd8d2c9abfeebf0d81a
│  │  ├─ fe
│  │  │  └─ 476e2ef4b450b89406fc5851a1df9b0036cbe9
│  │  ├─ info
│  │  └─ pack
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.idx
│  │     ├─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.pack
│  │     └─ pack-7865fd860c45eaa9e28d78a2209041a60ef6dbb5.rev
│  ├─ ORIG_HEAD
│  ├─ packed-refs
│  └─ refs
│     ├─ heads
│     │  └─ main
│     ├─ remotes
│     │  ├─ origin
│     │  │  ├─ angular10
│     │  │  ├─ angular11
│     │  │  ├─ angular12
│     │  │  ├─ angular13
│     │  │  ├─ angular14
│     │  │  ├─ angular16
│     │  │  ├─ angular4
│     │  │  ├─ angular5
│     │  │  ├─ angular6
│     │  │  ├─ angular7
│     │  │  ├─ angular8
│     │  │  ├─ angular9
│     │  │  ├─ dependabot
│     │  │  │  └─ npm_and_yarn
│     │  │  │     ├─ braces-3.0.3
│     │  │  │     ├─ multi-bbc963d221
│     │  │  │     └─ ws-8.17.1
│     │  │  ├─ feature
│     │  │  │  └─ migrate-to-esbuild
│     │  │  ├─ main
│     │  │  └─ misc
│     │  │     └─ replace-karma-with-jest
│     │  └─ upstream
│     │     ├─ angular10
│     │     ├─ angular11
│     │     ├─ angular12
│     │     ├─ angular13
│     │     ├─ angular14
│     │     ├─ angular16
│     │     ├─ angular4
│     │     ├─ angular5
│     │     ├─ angular6
│     │     ├─ angular7
│     │     ├─ angular8
│     │     ├─ angular9
│     │     ├─ dependabot
│     │     │  └─ npm_and_yarn
│     │     │     ├─ braces-3.0.3
│     │     │     ├─ multi-bbc963d221
│     │     │     └─ ws-8.17.1
│     │     ├─ feature
│     │     │  └─ migrate-to-esbuild
│     │     ├─ HEAD
│     │     ├─ main
│     │     └─ misc
│     │        └─ replace-karma-with-jest
│     └─ tags
├─ .github
│  ├─ dependabot.yml
│  ├─ FUNDING.yml
│  ├─ ISSUE_TEMPLATE
│  │  ├─ bug_report.md
│  │  ├─ bug_report.yml
│  │  ├─ feature_request.md
│  │  └─ feature_request.yml
│  ├─ pull_request_template.md
│  ├─ stale.yml
│  └─ workflows
│     ├─ macos.yml
│     ├─ ubuntu.yml
│     └─ windows.yml
├─ .gitignore
├─ .node-version
├─ .npmrc
├─ .nx
│  └─ cache
│     └─ 18.3.4-nx.win32-x64-msvc.node
├─ angular.json
├─ angular.webpack.js
├─ app
│  ├─ main.ts
│  ├─ package-lock.json
│  └─ package.json
├─ CHANGELOG.md
├─ CODE_OF_CONDUCT.md
├─ e2e
│  ├─ main.spec.ts
│  └─ playwright.config.ts
├─ electron-builder.json
├─ files
│  └─ data
│     ├─ cart_list.json
│     ├─ error_model_list.json
│     ├─ folder_list.json
│     ├─ folder_list.txt
│     ├─ must_add_list.json
│     ├─ offline_download_list.json
│     └─ tags_list.json
├─ file_structure.txt
├─ HOW_TO.md
├─ jest.config.js
├─ LICENSE.md
├─ package-lock.json
├─ package.json
├─ README.md
├─ src
│  ├─ app
│  │  ├─ app-routing.module.ts
│  │  ├─ app.component.html
│  │  ├─ app.component.scss
│  │  ├─ app.component.spec.ts
│  │  ├─ app.component.ts
│  │  ├─ app.module.ts
│  │  ├─ core
│  │  │  ├─ core.module.ts
│  │  │  └─ services
│  │  │     ├─ electron
│  │  │     │  ├─ electron.service.spec.ts
│  │  │     │  └─ electron.service.ts
│  │  │     └─ index.ts
│  │  ├─ detail
│  │  │  ├─ detail-routing.module.ts
│  │  │  ├─ detail.component.html
│  │  │  ├─ detail.component.scss
│  │  │  ├─ detail.component.spec.ts
│  │  │  ├─ detail.component.ts
│  │  │  └─ detail.module.ts
│  │  ├─ home
│  │  │  ├─ components
│  │  │  │  ├─ explorer-toolbar
│  │  │  │  │  ├─ explorer-toolbar.component.html
│  │  │  │  │  ├─ explorer-toolbar.component.scss
│  │  │  │  │  ├─ explorer-toolbar.component.spec.ts
│  │  │  │  │  └─ explorer-toolbar.component.ts
│  │  │  │  └─ file-list
│  │  │  │     ├─ file-list.component.html
│  │  │  │     ├─ file-list.component.scss
│  │  │  │     ├─ file-list.component.spec.ts
│  │  │  │     └─ file-list.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     └─ scroll-state.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences
│  │  │  │  ├─ preferences.component.html
│  │  │  │  ├─ preferences.component.scss
│  │  │  │  ├─ preferences.component.spec.ts
│  │  │  │  └─ preferences.component.ts
│  │  │  ├─ preferences-routing.module.ts
│  │  │  └─ preferences.module.ts
│  │  └─ shared
│  │     ├─ components
│  │     │  ├─ index.ts
│  │     │  └─ page-not-found
│  │     │     ├─ page-not-found.component.html
│  │     │     ├─ page-not-found.component.scss
│  │     │     ├─ page-not-found.component.spec.ts
│  │     │     └─ page-not-found.component.ts
│  │     ├─ directives
│  │     │  ├─ index.ts
│  │     │  └─ webview
│  │     │     ├─ webview.directive.spec.ts
│  │     │     └─ webview.directive.ts
│  │     └─ shared.module.ts
│  ├─ assets
│  │  ├─ .gitkeep
│  │  ├─ background.jpg
│  │  ├─ i18n
│  │  └─ icons
│  │     ├─ electron.bmp
│  │     ├─ favicon.256x256.png
│  │     ├─ favicon.512x512.png
│  │     ├─ favicon.icns
│  │     ├─ favicon.ico
│  │     └─ favicon.png
│  ├─ environments
│  │  ├─ environment.dev.ts
│  │  ├─ environment.prod.ts
│  │  ├─ environment.ts
│  │  ├─ environment.web.prod.ts
│  │  └─ environment.web.ts
│  ├─ favicon.ico
│  ├─ index.html
│  ├─ main.ts
│  ├─ polyfills-test.ts
│  ├─ polyfills.ts
│  ├─ styles.scss
│  ├─ tsconfig.app.json
│  └─ tsconfig.spec.json
├─ tsconfig.json
├─ tsconfig.serve.json
└─ _config.yml

```