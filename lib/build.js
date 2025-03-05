import log from 'npmlog'
import BuildFuncs from './buildFuncs.js'
import path from 'path'
import fs from 'fs'
import { glob, globSync, globStream, globStreamSync, Glob } from 'glob'
import { execSync } from 'child_process'

// const glob = Glob.default

export default class Build {
    constructor(config) {
        log.enableColor()
        const buildFuncs = new BuildFuncs(config, true)

        if (config.addtionalBuilder) {
            config.addtionalBuilder.forEach(command => {
                log.info('1735162591', 'processing builder')
                console.log(execSync(command).toString())
            })
        }

        config.sourcePackages.forEach(packageName => {
            const target = path.join(config.getSourceDir(), packageName, 'standalone')
            if (fs.existsSync(target)) {
                log.info('1683121055379', 'processing standalone')
                const targetPath = path.join(config.getSourceDir(), packageName, 'standalone/**/*')
                globSync(targetPath).forEach(file => {
                    if (fs.lstatSync(file).isFile()) {
                        const relativeFile = path.relative(
                            target,
                            file
                        )
                        buildFuncs.postHtmlProcessor({
                            file: relativeFile,
                            packageName: packageName,
                            standalone: true
                        })
                    }
                })
            }
        })

        config.sourcePackages.forEach(packageName => {
            const target = path.join(config.getSourceDir(), packageName, 'html')
            if (fs.existsSync(target)) {
                log.info('1679587969219', 'processing html')
                const targetPath = path.join(config.getSourceDir(), packageName, 'html/**/*')
                globSync(targetPath).forEach(file => {
                    if (fs.lstatSync(file).isFile()) {
                        const relativeFile = path.relative(
                            target,
                            file
                    )
                    buildFuncs.postHtmlProcessor({
                        file: relativeFile,
                            packageName: packageName
                        })
                    }
                })
            }
        })

        config.sourcePackages.forEach(packageName => {
            const target = path.join(config.getSourceDir(), packageName, 'js')
            if (fs.existsSync(target)) {
                log.info('1679587972748', 'processing js')
                const targetPath = path.join(config.getSourceDir(), packageName, 'js/*.js')
                globSync(targetPath).forEach(file => {
                const relativeFile = path.relative(
                    path.join(config.getSourceDir(), packageName, 'js'),
                    file
                )
                    buildFuncs.jsProcessor(relativeFile, packageName)
                })
            }
        })

        config.sourcePackages.forEach(packageName => {
            const target = path.join(config.getSourceDir(), packageName, 'scss')
            if (fs.existsSync(target)) {
                log.info('1679587977343', 'processing scss')
                const targetPath = [
                    path.join(config.getSourceDir(), packageName, 'scss/**/*.scss'),
                path.join(config.getSourceDir(), packageName, 'scss/**/*.sass')
            ]
            globSync(targetPath).forEach(file => {
                if (!path.basename(file).startsWith('_')) {
                        const relativeFile = path.relative(
                            target,
                            file
                        )
                        buildFuncs.sassProcessor(relativeFile, packageName)
                    }
                })
            }
        })
    }
}



