import path from 'path'
import fs from 'fs'
import log from 'npmlog'

export default class Check {
    constructor() {
        log.enableColor()
    }

    checkDirectories(config) {
        if (!fs.existsSync(config.getSourceDir())) {
            log.error('1679587190241', 'missing source directory - should be: ' + config.getSourceDir())
            process.exit(1)
        }

        if (!fs.existsSync(config.getPackagesDir())) {
            log.error('1679587199666', 'missing packages directory - should be: ' + config.getPackagesDir())
            process.exit(1)
        }

        config.sourcePackages = fs.readdirSync(config.getSourceDir()).filter(
            element => fs.lstatSync(path.join(config.getSourceDir(), element)).isDirectory()
        )


        config.sourcePackages.forEach((sourcePackage) => {
            if (!fs.existsSync(path.join(config.getPackagesDir(), sourcePackage))) {
                log.warn('1679587170195', `targetdirectory for package ${sourcePackage} is missing. I'm trying to create it`)
                fs.mkdirSync(path.join(config.getPackagesDir(), sourcePackage))
            }
        })

        return true
    }
}



