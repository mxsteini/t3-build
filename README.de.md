# t3-build

<!-- TOC -->
* [t3-build](#t3-build)
  * [Features](#features)
  * [Einleitung](#einleitung)
    * [Setup](#setup)
    * [Standalone Entwicklung](#standalone-entwicklung)
      * [Einschränkungen](#einschränkungen)
    * [FLUID Entwicklung](#fluid-entwicklung)
  * [Standalone und FLUID parallel entwickeln](#standalone-und-fluid-parallel-entwickeln)
  * [Component driven Design](#component-driven-design)
<!-- TOC -->

## Features

- Component Driven Design (HTML+SCSS)
- natives HTML
- Compiles to native FLUID
- Standalone HTML-Development
- Hot Reload via browsersync for ANY changes: Files and Database
- Easy templating with special tags: <include> and <module>
- Esbuild: The ultra fast javascript bundler
- side-by-side Development of classic frontend an fluid integration

## Einleitung

Mit t3-build erstellst Du native TYPO3 Templates und Partials die direkt und ohne weiteres Plugin in der Website verwendet werden können.
t3-build wird ausschließlich während der Entwicklung und in der Build Pipeline verwendet. Die Artefakte sind natives FLUID, CSS und Javascript.

### Setup

(convention ~~over~~without configuration)
Um die Entwicklung etwas zu vereinfachen, wird eine einfache Verzeichnisstruktur vorausgesetzt.
```bash
packages
└── packagename
src
└── packagename
    ├── assets
    │     ├── Private
    │     └── Public
    ├── html
    │     ├── Layouts
    │     ├── Partials
    │     └── Templates
    ├── includes
    │     └── Dummycontent.html
    ├── js
    │     └── Main.js
    ├── scss
    │     └── style.scss
    └── standalone
        └── index.html
```

* packages:\
In diesem Verzeichnis befinden sie die lokalen Pakete zu TYPO3-Installation
* src:\
t3-build übersetzt ausschließlich Dateien die im src-Verzeichnis gefunden werden.
Innerhalb des src-Verzeichnisses muss sich ein weiteres Verzeichnis mit dem Namen des TYPO3 Ziel Packages befinden.
* src/packagename/assets/[Private|Public]:\
Alle Verzeichnisse und Dateien sich hier befinden, werden 1:1 direkt in das Package nach packagename/Resources kopiert. Dadurch werden komplizierte Regeln in .gitingore vermieden.
* src/packagename/standalone:\
In diesem Verzeichnis befindet sich die index.html für eine klassiche Frontententwicklung.
* src/packagename/js:\
Alle Javascript-Quellen. Überseztungen landen in packages/packagename/Resources/Public/Js
* src/packagename/scss:\
Alle Scss-Quellen. Überseztungen landen in packages/packagename/Resources/Public/Css
* src/packagename/includes:\
Hier können Dateien abgelegt werden, die über \<include> oder \<module> in die Templates eingebunden werden.

### Standalone Entwicklung

t3-build beinhaltet eine Umgebung und ein klassisches Frontend zu entwickeln.

Der Startpunkt für die Entwcklung befindet sich in src/packagename/standalone/index.html. Mit den Tags <include> und <module> ist der Entwickler in der Lage Teile seines Codes wieder zu verwenden.

Weitere Informationen
* \<include /> \
[posthtml/posthtml-include](https://github.com/posthtml/posthtml-include)
* \<module /> \
[posthtml/posthtml-module](https://github.com/posthtml/posthtml-module)

Die Übersetzungen von t3-build werden nach packages/packagename/Resources/Public/Standalone geschrieben.

Bilder sollten immer relativ referenziert werden:
<img src="../Images/image.png" />

#### Einschränkungen
Werden Dateien, die \<include> oder \<module> geändert, wird **kein** rekursiver build ausgelöst. Um sicher zu gehen, dass alle sich alle beteiligten Dateien richtig anpassen, muss der watcher neu gestartet werden.

### FLUID Entwicklung
Für die FLUID Entwicklung steht das Verzeichnis src/packagename/html zu Verfügung. Innerhalb dieses Verzeichnisses kann der Entwickler jede beliebige Strukktur erstellen.

## Standalone und FLUID parallel entwickeln

Damit t3-build richtig funktioniert, benötigt jedes HTML-Template ein umfassendes HTML-Tag. Im klassischen Frontend Prozess wird dieses Tag bei der Übersetzung entfernt. Im FLUID-Template bleibt es erhalten und er Entwickler hat die Möglichkeit, hier seine benötigten Namespaces zu deklarieren.

Um die verchiedenen Stadien der Frontend Entwicklung und der Integration parallel zu ermöglichen, wurden die Tags \<standalone> und \<fluid> eingeführt.

Ein typische Template für ein Text Element könnte so aussehen:

```html
<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers"
      data-namespace-typo3-fluid="true">
<div class="textpic">
    <div class="textpic__header">
        <standalone>
            <h1>Very Important Header</h1>
        </standalone>
        <fluid>
            {data.header}
        </fluid>
    </div>
    <div class="textpic__bodytext">
        <standalone>
            <p>Lorem ipsum</p>
        </standalone>
        <fluid>
            {data.bodytext}
        </fluid>
    </div>
</div>
</html>
```

## Separation of Concerns
react und vue.js haben gezeigt, dass dieser Ansatz die Entwicklung von Komponenten wesentlich vereinfacht. Die Pflege eine Komponente sollte sich während ihrer Lebenszeit möglichst auf eine Datei beschränken.

Um das diesen Ansatz zu implementieren, kann ein Template eine \<style> Tag mit scss enthalten. Ein Template kann z. B. so aussehen:

src/packagename/Resource/Private/Templates/Text.html
```html
<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers"
      data-namespace-typo3-fluid="true">
<f:layout name="Default"/>
<f:section name="Main">
    <div class="textpic">
        <div class="textpic__header">
            {data.header}
        </div>
        <div class="textpic__bodytext">
            {data.bodytext}
        </div>
    </div>
</f:section>

<style type="text/scss" section="Main">
    .textpic {
        &__header {
            color: red;
        }
        &__bdoytext {
            color: green;
        }
    }
</style>
</html>
```
wird übersetzt nach:\
src/packagename/Resource/Private/Templates/Text.html
```html
<html xmlns:f="http://typo3.org/ns/TYPO3/CMS/Fluid/ViewHelpers" data-namespace-typo3-fluid="true">
<f:layout name="Default"></f:layout>
<f:section name="Main">
    <f:asset.css identifier="packagename/Templates/TextMain"
                 href="EXT:mst_site/Resources/Public/Css/Templates/TextMain.css"></f:asset.css>
    <div class="textpic">
        <div class="textpic__header">
            {data.header}
        </div>
        <div class="textpic__bodytext">
            {data.bodytext}
        </div>
    </div>
</f:section>
</html>
```

Wer an dieser Steller sein Javascript noch in der Komponente platzieren möchte, sollte sich unbedingt mit [alpinejs](https://alpinejs.dev/) vertraut machen.

Über diese Bibliothek ist es möglich, ein reaktives Frontend zu erstellen ohne die bekannten Entwicklungsmuster (vue.js, react, etc.) zu verwenden.
