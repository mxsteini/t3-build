import path from 'path'
import fs from 'fs'
import log from 'npmlog'
import BuildFuncs from './buildFuncs.js'
import * as NodeWatch from 'node-watch'
import * as Glob from 'glob'
import * as Fse from 'fs-extra'

const fse = Fse.default

const watch = NodeWatch.default
const glob = Glob.default

export default class Watch {
    constructor(config) {
        log.enableColor()
        const buildFuncs = new BuildFuncs(config, false)
        buildFuncs.createBrowsersync(config)

        console.log('start sass-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'scss')
            watch(targetPath, {recursive: true}, (event, target) => {
                this.sassEvent(config, packageName, buildFuncs);
            })
        })

        console.log('start js-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'js')
            watch(targetPath, {recursive: true}, (event, target) => {
                this.jsEvent(config, packageName, buildFuncs);
            })
        })

        console.log('start html-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'html')
            watch(targetPath, {recursive: true},  (event, target) =>  {
                this.htmlEvent(config, packageName, target, event, buildFuncs);
            })
        })

        console.log('start standalone-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = [
                path.join(config.getSourceDir(), packageName, 'standalone'),
                path.join(config.getSourceDir(), packageName, 'html')
            ]
            watch(targetPath, {recursive: true}, (event, target) =>  {
                this.standaloneEvent(config, packageName, event, buildFuncs);
            })
        })

        console.log('start asset-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'assets')
            watch(targetPath, {recursive: true}, (event, target) => {
                this.assetEvent(config, packageName, target, event, buildFuncs);
            })
        })
        buildFuncs.clearCache(true, true)
    }

    sassEvent(config, packageName, buildFuncs) {
        const targetPath = [
            path.join(config.getSourceDir(), packageName, 'scss/**/*.scss'),
            path.join(config.getSourceDir(), packageName, 'scss/**/*.sass')
        ]
        glob.sync(targetPath).forEach(file => {
            if (!path.basename(file).startsWith('_')) {
                const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'scss'), file)
                return buildFuncs.sassProcessor(relativeFile, packageName, true)
            }
        })
    }

    jsEvent(config, packageName, buildFuncs) {
        const targetPath = path.join(config.getSourceDir(), packageName, 'js/*.js')
        glob.sync(targetPath).forEach(file => {
            const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'js'), file)
            buildFuncs.jsProcessor(relativeFile, packageName, true)
        })
    }

    htmlEvent(config, packageName, target, event, buildFuncs) {
        const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'html'), target)

        switch (event) {
            case 'update':
                buildFuncs.postHtmlProcessor({
                    file: relativeFile,
                    packageName: packageName,
                    reload: true
                })
                break
            case 'remove':
                fse.removeSync(path.join(config.getPackagesDir(), packageName, 'Resources/Private', relativeFile))
                break
        }
    }

    assetEvent(config, packageName, target, event, buildFuncs) {
        const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'assets'), target)
        switch (event) {
            case 'update':
                fse.copySync(
                    path.join(config.getSourceDir(), packageName, 'assets', relativeFile),
                    path.join(config.getPackagesDir(), packageName, 'Resources', relativeFile)
                )
                break
            case 'remove':
                fse.removeSync(path.join(config.getPackagesDir(), packageName, 'Resources', relativeFile))
                break
        }
        buildFuncs.clearCache(true, true)
    }

    standaloneEvent(config, packageName, event, buildFuncs) {
        const targetPath = path.join(config.getSourceDir(), packageName, 'standalone/**/*')
        glob.sync(targetPath).forEach(file => {
            const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'standalone'), file)

            switch (event) {
                case 'update':
                    buildFuncs.postHtmlProcessor({
                        file: relativeFile,
                        packageName: packageName,
                        reload: true,
                        standalone: true
                    })
                    break
                case 'remove':
                    fse.removeSync(path.join(config.getPackagesDir(), packageName, 'Resources/Private', relativeFile))
                    break
            }
        })
    }
}
