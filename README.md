# t3-build

t3-build is a tool that builds js, scss and HTML from extension sources into TYPO3 extensions.

This package is mostly usefull in a TYPO3 composer project.

It provides a super fast browsersync driven environment to create your frontend stuff directly in your cms.

In addition it provides a way to create HTML components that container HTML and scss in one file.

This is pretty cool if your creating your components along the BEM methodology. Read more: https://getbem.com/

You can use it also in other project. But you have to setup your directories to this conventions.

If you wanna get rid of gulp, grunt or webpack in your php-based projects, give the idea a try - yo6u don't need this
tools.

## Features

* HTML components containing HTML and SCSS
* sass
* esbuild
* browsersync

# Install

```bash
npm i t3-build
```

# Usage

## One run build

```bash
npx t3-build build
```

## Watcher

```bash
npx t3-build watch
```

## Convention <del>over</del> without configuration

To make this tool fast and easy to use, I waived any possible configuration and implemented the most usual structure
I've
seen over the years.
The common part is to hold all none-packagist-packages in the packages folder.

To get an idea, have a look of a "normal" composer-driven typo3 installation.

Your site-specific extension are places in "packages"

```bash
├── composer.json
├── config
│   └── sites
├── package.json
├── package-lock.json
├── packages
│   ├── ext_a
│   │   ├── Classes
│   │   ├── composer.json
│   │   ├── ext_emconf.php
│   │   ├── ext_localconf.php
│   │   ├── ext_tables.php
│   │   └── Resources
│   └── ext_b
│       ├── Classes
│       ├── composer.json
│       ├── ext_emconf.php
│       ├── ext_localconf.php
│       ├── ext_tables.php
│       └── Resources
├── public
└── src
    ├── ext_a
    │   ├── assets
    │   ├── html
    │   ├── js
    │   ├── Resources
    │   └── scss
    └── ext_b
        ├── assets
        ├── html
        ├── html-modules
        ├── js
        └── scss
```

All needed content for the frontend process is held in the src directory.

## src folder in detail

The src folder contains a folder for each package that needs processed frontend stuff

```bash
src/ext_b
├── assets
│   ├── Private
│   └── Public
├── standalone
├── html
│   ├── Templates
│   ├── Layouts
│   └── Partials
├── html-modules
│   ├── Partials
│   └── svg
├── js
│   └── Main.js
└── scss
    ├── Default
    ├── Extensions
    ├── Fontawesome
    ├── Modules
    ├── Smartmenu
    ├── style.scss
    └── _variables.scss
```

With a little glimpse of fantasy a well-trained TYPO3-engineer could see the TYPO3 folder structure in this directory.

To prevent complex rules for Resources folder, I simply moved everything to src folder.

So you could add ```packages/*/Resources``` to your .gitignore.

## Processed files

* Everything from assets goes straight into Resources/
* Everything from scss is processed by sass an goes into Resources/Public/Css/
* Everything from js is processed by esbuild as goes into Resources/Publid/Js/
* Everything from html is processed by posthtml and the html goes into Resources/Private/. scss parts are separated and
  written to
  Resources/Public/Css/

# HTML Components

As mentoinend above, you can create HTML components which included sass:

ext_b/html/Partials/partial.html

```html

<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers"
      data-namespace-typo3-fluid="true">

<div class="textpic">
    <heaser class="textpic__header">
        This is a header
    </heaser>
</div>

<style type="text/scss">
    .textpic {
        background: blue;

        &__header {
            background: green
        }
    }
</style>
</html>
```

which results in:

ext_b/Resource/Private/Partials/partial.html

```html

<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers" data-namespace-typo3-fluid="true">
<f:asset.css identifier="ext_b/Partials/partial"
             href="EXT:ext_b/Resources/Public/Css/Partials/partial.css"></f:asset.css>
<div class="textpic">
    <heaser class="textpic__header">
        This is a header
    </heaser>
</div>
</html>
```

and

ext_b/Resources/Public/Css/Partials/partial.css

```css
.textpic {
    background: blue;
}

.textpic__header {
    background: green;
}
```

# TYPO3 Cache

When reloading the page by browsersync, you always wants to clear the TYPO3 Page-Cache.

That will cost some extra milliseconds, which could by anoying. If you are using the recommended dotenv-connector by helhum, you can easily disable the your TYPO3 cache by something like this:

```php
if ($_ENV['T3BUILD_BRWOSERSYNC_TYPO3_DISABLE_PAGECACHE'] == true) {
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['cache_pages']['backend'] = \TYPO3\CMS\Core\Cache\Backend\NullBackend::class;
    $GLOBALS['TYPO3_CONF_VARS']['SYS']['caching']['cacheConfigurations']['cache_pagesection']['backend'] = \TYPO3\CMS\Core\Cache\Backend\NullBackend::class;
}
```

Then you can insert
```.dotenv
T3BUILD_TYPO3_CLEARCACHECMD=":"
```

This is the fastest way to run this system.

> **BUT BE AWARE - YOU ARE RUNNING A UNCACHED SYSTEM - THIS IS NOT NORMAL !!!!**

# browsersync

To use the watcher and browsersync, you have to setup the variables in the setup Configuration.

# Configuration

Well, some configuration is needed. Especially if you want to use browsersync.

These configuration are stored in .env or could be set in environment.

| Variable                                    | Mandatory | default                                 | description                                      |
|---------------------------------------------|:---------:|-----------------------------------------|--------------------------------------------------|
| T3BUILD_SRC                                 |     x     | src                                     | The folder where you put your sources            |
| T3BUILD_PACKAGES                            |     x     | packages                                | The folder where you put your packages           |
| T3BUILD_BRWOSERSYNC_STANDALONE_HOST         |     x     |                                         | https://browsersync.io/docs/options#option-host  |
| T3BUILD_BRWOSERSYNC_STANDALONE_PORT         |     x     |                                         | https://browsersync.io/docs/options#option-port  |
| T3BUILD_BRWOSERSYNC_TYPO3_HOST              |     x     |                                         | https://browsersync.io/docs/options#option-host  |
| T3BUILD_BRWOSERSYNC_TYPO3_PORT              |     x     |                                         | https://browsersync.io/docs/options#option-port  |
| T3BUILD_BRWOSERSYNC_PROXY                   |     x     |                                         | https://browsersync.io/docs/options#option-proxy |
| T3BUILD_BRWOSERSYNC_SSL_KEY                 |           |                                         | https://browsersync.io/docs/options#option-https |
| T3BUILD_BRWOSERSYNC_SSL_CERT                |           |                                         | https://browsersync.io/docs/options#option-https |
| T3BUILD_BRWOSERSYNC_OPEN                    |           | true                                    | https://browsersync.io/docs/options#option-open  |
| T3BUILD_TYPO3_CLEARALLCACHECMD              |     x     | ddev typo3cms cache:flush"              | The "red flash" cache                            |
| T3BUILD_TYPO3_CLEARCACHECMD                 |     x     | ddev typo3cms cache:flush --group=pages | The "green flash" cache                          |
| T3BUILD_BRWOSERSYNC_TYPO3_DISABLE_PAGECACHE |           |                                         | See TYPO3 Cache section                          |

## addtional builder and watcher

You can add addtional builder and watcher to your package.json.

```json
"t3-build": {
	"addtionalBuilder": [ "echo test", "echo test2" ],
	"addtionalWatcher": [
		{ "pattern": "test", "command": "echo {event} {target}" }
	]
}
```

# Credits

* Frank Deutschmann - you encouraged me to go on in this project
* https://www.monobloc.de/
