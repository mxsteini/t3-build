import log from 'npmlog'
import BuildFuncs from './buildFuncs.js'
import path from 'path'
import * as Glob from 'glob'

const glob = Glob.default

export default class Build {
    constructor(config) {
        log.enableColor()
        const buildFuncs = new BuildFuncs(config, true)

        log.info('1679587969219', 'processing html')
        config.sourcePackages.forEach(packageName => {
            const targetPath = path.join(config.getSourceDir(), packageName, 'html/**/*.html')
            glob.sync(targetPath).forEach(file => {
                const relativeFile = path.relative(
                    path.join(config.getSourceDir(), packageName, 'html'),
                    file
                )
                buildFuncs.postHtmlProcessor(relativeFile, packageName)
            })
        })

        log.info('1679587972748', 'processing js')
        config.sourcePackages.forEach(packageName => {
            const targetPath = path.join(config.getSourceDir(), packageName, 'js/*.js')
            glob.sync(targetPath).forEach(file => {
                const relativeFile = path.relative(
                    path.join(config.getSourceDir(), packageName, 'js'),
                    file
                )
                buildFuncs.jsProcessor(relativeFile, packageName)
            })
        })

        log.info('1679587977343', 'processing scss')
        config.sourcePackages.forEach(packageName => {
            const targetPath = path.join(config.getSourceDir(), packageName, 'scss/**/*.scss')
            glob.sync(targetPath).forEach(file => {
                if (!path.basename(file).startsWith('_')) {
                    const relativeFile = path.relative(
                        path.join(config.getSourceDir(), packageName, 'scss'),
                        file
                    )
                    buildFuncs.sassProcessor(relativeFile, packageName)
                }
            })
        })
    }
}



