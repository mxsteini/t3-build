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
        buildFuncs.createBrowsersync()

        console.log('start sass-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'scss')
            watch(targetPath, {recursive: true}, function (event, target) {
                const targetPath = path.join(config.getSourceDir(), packageName, 'scss/**/*.scss')
                glob.sync(targetPath).forEach(file => {
                    if (!path.basename(file).startsWith('_')) {
                        const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'scss'), file)
                        buildFuncs.sassProcessor(relativeFile, packageName, buildFuncs.bs.reload())
                    }
                })
            })
        })

        console.log('start js-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'js')
            watch(targetPath, {recursive: true}, function (event, target) {
                const targetPath = path.join(config.getSourceDir(), packageName, 'js/*.js')
                glob.sync(targetPath).forEach(file => {
                    const relativeFile = path.relative(path.join(config.getSourceDir(), packageName, 'js'), file)
                    buildFuncs.jsProcessor(relativeFile, packageName, buildFuncs.bs.reload())
                })
            })
        })

        console.log('start html-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'html')
            watch(targetPath, {recursive: true}, function (event, target) {
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
                        fs.unlinkSync(path.join(config.getPackagesDir(), packageName, 'Resources/Private', relativeFile))
                        break
                }
            })
        })

        console.log('start asset-watcher for:')
        config.sourcePackages.forEach(packageName => {
            console.log('… ' + packageName)
            const targetPath = path.join(config.getSourceDir(), packageName, 'assets')
            watch(targetPath, {recursive: true}, function (event, target) {
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
            })
        })
    }
}
