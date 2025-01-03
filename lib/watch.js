import path from 'path'
import fs from 'fs'
import log from 'npmlog'
import BuildFuncs from './buildFuncs.js'
import * as NodeWatch from 'node-watch'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import * as Fse from 'fs-extra'
import { execSync } from 'child_process'

const fse = Fse.default

const watch = NodeWatch.default

export default class Watch {
    constructor(config) {
        log.enableColor()
        const buildFuncs = new BuildFuncs(config, false)
        buildFuncs.createBrowsersync(config)
        if (config.addtionalWatcher) {
            config.addtionalWatcher.forEach(watcher => {
                console.log('start addtional watcher for:')
                console.log('… ' + watcher.pattern)
            const targetPath = path.join(config.getSourceDir(), watcher.pattern)
            watch(targetPath, {recursive: true}, (event, target) => {
                const command = watcher.command.replace('{event}', event).replace('{target}', target)
                console.log(command)
                    console.log(execSync(command).toString())
                })
            })
        }

        config.sourcePackages.forEach(packageName => {
            const targetPath = path.join(config.getSourceDir(), packageName, 'scss')
            if (fs.existsSync(targetPath)) {
                console.log('start sass-watcher for:')
                console.log('… ' + packageName)
                watch(targetPath, {recursive: true}, (event, target) => {
                    this.sassEvent(config, packageName, buildFuncs);
                })
            }
        })

        config.sourcePackages.forEach(packageName => {
            const targetPath = path.join(config.getSourceDir(), packageName, 'js')
            if (fs.existsSync(targetPath)) {
                console.log('start js-watcher for:')
                console.log('… ' + packageName)
                watch(targetPath, {recursive: true}, (event, target) => {
                    this.jsEvent(config, packageName, buildFuncs);
                })
            }
        })

        config.sourcePackages.forEach(packageName => {
            const targetPath = path.join(config.getSourceDir(), packageName, 'html')
            if (fs.existsSync(targetPath)) {
                console.log('start html-watcher for:')
                console.log('… ' + packageName)
                watch(targetPath, {recursive: true},  (event, target) =>  {
                    this.htmlEvent(config, packageName, target, event, buildFuncs);
                })
            }
        })

        config.sourcePackages.forEach(packageName => {
            
            const targetPath = path.join(config.getSourceDir(), packageName, 'standalone')
            if (fs.existsSync(targetPath)) {
                console.log('start standalone-watcher for:')
                console.log('… ' + packageName)
                watch(targetPath, {recursive: true}, (event, target) =>  {
                    this.standaloneEvent(config, packageName, event, buildFuncs);
                })
            }
        })

        config.sourcePackages.forEach(packageName => {
            const targetPath = path.join(config.getSourceDir(), packageName, 'assets')
            if (fs.existsSync(targetPath)) {
                console.log('start asset-watcher for:')
                console.log('… ' + packageName)
                watch(targetPath, {recursive: true}, (event, target) => {
                    this.assetEvent(config, packageName, target, event, buildFuncs);
                })
            }
        })
        buildFuncs.clearCache(true, true)
    }

    sassEvent(config, packageName, buildFuncs) {
        const targetPath = [
            path.join(config.getSourceDir(), packageName, 'scss/**/*.scss'),
            path.join(config.getSourceDir(), packageName, 'scss/**/*.sass')
        ]
        globSync(targetPath).forEach(file => {
            if (!path.basename(file).startsWith('_')) {
                const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'scss'), file)
                return buildFuncs.sassProcessor(relativeFile, packageName, true)
            }
        })
    }

    jsEvent(config, packageName, buildFuncs) {
        const targetPath = path.join(config.getSourceDir(), packageName, 'js/*.js')
        globSync(targetPath).forEach(file => {
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
        globSync(targetPath).forEach(file => {
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
