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
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  └─ file-list
│  │  │  │     ├─ file-list.component.html
│  │  │  │     ├─ file-list.component.scss
│  │  │  │     ├─ file-list.component.spec.ts
│  │  │  │     ├─ file-list.component.ts
│  │  │  │     └─ model
│  │  │  │        └─ directory-item.model.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     └─ selection.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  └─ preferences.module.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  └─ file-list
│  │  │  │     ├─ file-list.component.html
│  │  │  │     ├─ file-list.component.scss
│  │  │  │     ├─ file-list.component.spec.ts
│  │  │  │     ├─ file-list.component.ts
│  │  │  │     └─ model
│  │  │  │        └─ directory-item.model.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     └─ selection.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  └─ preferences.module.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  └─ update-sidebar
│  │  │  │     ├─ update-sidebar.component.html
│  │  │  │     ├─ update-sidebar.component.scss
│  │  │  │     ├─ update-sidebar.component.spec.ts
│  │  │  │     └─ update-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     └─ selection.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  └─ update-sidebar
│  │  │  │     ├─ update-sidebar.component.html
│  │  │  │     ├─ update-sidebar.component.scss
│  │  │  │     ├─ update-sidebar.component.spec.ts
│  │  │  │     └─ update-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     └─ selection.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  ├─ model-modal
│  │  │  │  │  ├─ model-modal.component.html
│  │  │  │  │  ├─ model-modal.component.scss
│  │  │  │  │  ├─ model-modal.component.spec.ts
│  │  │  │  │  └─ model-modal.component.ts
│  │  │  │  └─ update-sidebar
│  │  │  │     ├─ update-sidebar.component.html
│  │  │  │     ├─ update-sidebar.component.scss
│  │  │  │     ├─ update-sidebar.component.spec.ts
│  │  │  │     └─ update-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     └─ selection.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  ├─ model-modal
│  │  │  │  │  ├─ model-modal.component.html
│  │  │  │  │  ├─ model-modal.component.scss
│  │  │  │  │  ├─ model-modal.component.spec.ts
│  │  │  │  │  └─ model-modal.component.ts
│  │  │  │  └─ update-sidebar
│  │  │  │     ├─ update-sidebar.component.html
│  │  │  │     ├─ update-sidebar.component.scss
│  │  │  │     ├─ update-sidebar.component.spec.ts
│  │  │  │     └─ update-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     └─ selection.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  ├─ grouping-sidebar
│  │  │  │  │  ├─ grouping-sidebar.component.html
│  │  │  │  │  ├─ grouping-sidebar.component.scss
│  │  │  │  │  ├─ grouping-sidebar.component.spec.ts
│  │  │  │  │  └─ grouping-sidebar.component.ts
│  │  │  │  ├─ model-modal
│  │  │  │  │  ├─ model-modal.component.html
│  │  │  │  │  ├─ model-modal.component.scss
│  │  │  │  │  ├─ model-modal.component.spec.ts
│  │  │  │  │  └─ model-modal.component.ts
│  │  │  │  ├─ update-sidebar
│  │  │  │  │  ├─ update-sidebar.component.html
│  │  │  │  │  ├─ update-sidebar.component.scss
│  │  │  │  │  ├─ update-sidebar.component.spec.ts
│  │  │  │  │  └─ update-sidebar.component.ts
│  │  │  │  └─ zip-sidebar
│  │  │  │     ├─ zip-sidebar.component.html
│  │  │  │     ├─ zip-sidebar.component.scss
│  │  │  │     ├─ zip-sidebar.component.spec.ts
│  │  │  │     └─ zip-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     ├─ selection.service.ts
│  │  │     └─ zip.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  ├─ grouping-sidebar
│  │  │  │  │  ├─ grouping-sidebar.component.html
│  │  │  │  │  ├─ grouping-sidebar.component.scss
│  │  │  │  │  ├─ grouping-sidebar.component.spec.ts
│  │  │  │  │  └─ grouping-sidebar.component.ts
│  │  │  │  ├─ model-modal
│  │  │  │  │  ├─ model-modal.component.html
│  │  │  │  │  ├─ model-modal.component.scss
│  │  │  │  │  ├─ model-modal.component.spec.ts
│  │  │  │  │  └─ model-modal.component.ts
│  │  │  │  ├─ update-sidebar
│  │  │  │  │  ├─ update-sidebar.component.html
│  │  │  │  │  ├─ update-sidebar.component.scss
│  │  │  │  │  ├─ update-sidebar.component.spec.ts
│  │  │  │  │  └─ update-sidebar.component.ts
│  │  │  │  └─ zip-sidebar
│  │  │  │     ├─ zip-sidebar.component.html
│  │  │  │     ├─ zip-sidebar.component.scss
│  │  │  │     ├─ zip-sidebar.component.spec.ts
│  │  │  │     └─ zip-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     ├─ selection.service.ts
│  │  │     └─ zip.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ update
│  │     ├─ update-routing.module.ts
│  │     ├─ update.component.html
│  │     ├─ update.component.scss
│  │     ├─ update.component.spec.ts
│  │     ├─ update.component.ts
│  │     └─ update.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  ├─ grouping-sidebar
│  │  │  │  │  ├─ grouping-sidebar.component.html
│  │  │  │  │  ├─ grouping-sidebar.component.scss
│  │  │  │  │  ├─ grouping-sidebar.component.spec.ts
│  │  │  │  │  └─ grouping-sidebar.component.ts
│  │  │  │  ├─ model-modal
│  │  │  │  │  ├─ model-modal.component.html
│  │  │  │  │  ├─ model-modal.component.scss
│  │  │  │  │  ├─ model-modal.component.spec.ts
│  │  │  │  │  └─ model-modal.component.ts
│  │  │  │  ├─ update-sidebar
│  │  │  │  │  ├─ update-sidebar.component.html
│  │  │  │  │  ├─ update-sidebar.component.scss
│  │  │  │  │  ├─ update-sidebar.component.spec.ts
│  │  │  │  │  └─ update-sidebar.component.ts
│  │  │  │  └─ zip-sidebar
│  │  │  │     ├─ zip-sidebar.component.html
│  │  │  │     ├─ zip-sidebar.component.scss
│  │  │  │     ├─ zip-sidebar.component.spec.ts
│  │  │  │     └─ zip-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     ├─ selection.service.ts
│  │  │     └─ zip.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ virtual
│  │     ├─ virtual-routing.module.ts
│  │     ├─ virtual.component.html
│  │     ├─ virtual.component.scss
│  │     ├─ virtual.component.spec.ts
│  │     ├─ virtual.component.ts
│  │     └─ virtual.module.ts
│  ├─ assets
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
│  │  │  │  ├─ file-info-sidebar
│  │  │  │  │  ├─ file-info-sidebar.component.html
│  │  │  │  │  ├─ file-info-sidebar.component.scss
│  │  │  │  │  ├─ file-info-sidebar.component.spec.ts
│  │  │  │  │  └─ file-info-sidebar.component.ts
│  │  │  │  ├─ file-list
│  │  │  │  │  ├─ file-list.component.html
│  │  │  │  │  ├─ file-list.component.scss
│  │  │  │  │  ├─ file-list.component.spec.ts
│  │  │  │  │  ├─ file-list.component.ts
│  │  │  │  │  └─ model
│  │  │  │  │     └─ directory-item.model.ts
│  │  │  │  ├─ grouping-sidebar
│  │  │  │  │  ├─ grouping-sidebar.component.html
│  │  │  │  │  ├─ grouping-sidebar.component.scss
│  │  │  │  │  ├─ grouping-sidebar.component.spec.ts
│  │  │  │  │  └─ grouping-sidebar.component.ts
│  │  │  │  ├─ model-modal
│  │  │  │  │  ├─ model-modal.component.html
│  │  │  │  │  ├─ model-modal.component.scss
│  │  │  │  │  ├─ model-modal.component.spec.ts
│  │  │  │  │  └─ model-modal.component.ts
│  │  │  │  ├─ update-sidebar
│  │  │  │  │  ├─ update-sidebar.component.html
│  │  │  │  │  ├─ update-sidebar.component.scss
│  │  │  │  │  ├─ update-sidebar.component.spec.ts
│  │  │  │  │  └─ update-sidebar.component.ts
│  │  │  │  └─ zip-sidebar
│  │  │  │     ├─ zip-sidebar.component.html
│  │  │  │     ├─ zip-sidebar.component.scss
│  │  │  │     ├─ zip-sidebar.component.spec.ts
│  │  │  │     └─ zip-sidebar.component.ts
│  │  │  ├─ home-routing.module.ts
│  │  │  ├─ home.component.html
│  │  │  ├─ home.component.scss
│  │  │  ├─ home.component.spec.ts
│  │  │  ├─ home.component.ts
│  │  │  ├─ home.module.ts
│  │  │  └─ services
│  │  │     ├─ explorer-state.service.ts
│  │  │     ├─ home-refresh.service.ts
│  │  │     ├─ navigation.service.ts
│  │  │     ├─ scroll-state.service.ts
│  │  │     ├─ search.service.ts
│  │  │     ├─ selection.service.ts
│  │  │     └─ zip.service.ts
│  │  ├─ preferences
│  │  │  ├─ preferences-routing.module.ts
│  │  │  ├─ preferences.component.html
│  │  │  ├─ preferences.component.scss
│  │  │  ├─ preferences.component.spec.ts
│  │  │  ├─ preferences.component.ts
│  │  │  ├─ preferences.module.ts
│  │  │  └─ preferences.service.ts
│  │  ├─ recycle
│  │  │  ├─ model
│  │  │  │  └─ recycle-record.model.ts
│  │  │  ├─ recycle.component.html
│  │  │  ├─ recycle.component.scss
│  │  │  ├─ recycle.component.spec.ts
│  │  │  ├─ recycle.component.ts
│  │  │  └─ recycle.service.ts
│  │  ├─ shared
│  │  │  ├─ components
│  │  │  │  ├─ index.ts
│  │  │  │  └─ page-not-found
│  │  │  │     ├─ page-not-found.component.html
│  │  │  │     ├─ page-not-found.component.scss
│  │  │  │     ├─ page-not-found.component.spec.ts
│  │  │  │     └─ page-not-found.component.ts
│  │  │  ├─ directives
│  │  │  │  ├─ index.ts
│  │  │  │  └─ webview
│  │  │  │     ├─ webview.directive.spec.ts
│  │  │  │     └─ webview.directive.ts
│  │  │  └─ shared.module.ts
│  │  └─ virtual
│  │     ├─ components
│  │     │  ├─ virtual-explorer-toolbar
│  │     │  │  ├─ virtual-explorer-toolbar.component.html
│  │     │  │  ├─ virtual-explorer-toolbar.component.scss
│  │     │  │  ├─ virtual-explorer-toolbar.component.spec.ts
│  │     │  │  └─ virtual-explorer-toolbar.component.ts
│  │     │  ├─ virtual-file-info-sidebar
│  │     │  │  ├─ virtual-file-info-sidebar.component.html
│  │     │  │  ├─ virtual-file-info-sidebar.component.scss
│  │     │  │  ├─ virtual-file-info-sidebar.component.spec.ts
│  │     │  │  └─ virtual-file-info-sidebar.component.ts
│  │     │  └─ virtual-file-list
│  │     │     ├─ virtual-file-list.component.html
│  │     │     ├─ virtual-file-list.component.scss
│  │     │     ├─ virtual-file-list.component.spec.ts
│  │     │     └─ virtual-file-list.component.ts
│  │     ├─ services
│  │     │  └─ virtual.service.ts
│  │     ├─ virtual-routing.module.ts
│  │     ├─ virtual.component.html
│  │     ├─ virtual.component.scss
│  │     ├─ virtual.component.spec.ts
│  │     ├─ virtual.component.ts
│  │     └─ virtual.module.ts
│  ├─ assets
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