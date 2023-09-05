import commandLineArgs from 'command-line-args'
import commandLineUsage from 'command-line-usage'
import path from 'path'
import fs from 'fs'
import {fileURLToPath} from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)


export default class Config {
    packageConfig = {}

    commands = [
        {name: 'watch', summary: 'Watch project.'},
        {name: 'build', summary: 'Build html, js, css.'},
        {name: 'init', summary: 'Future usage.'},
        {name: 'help', summary: 'Display this usage guide.'}]

    options = {
        generic: [
            {name: 'help', alias: 'h', description: 'print this help'},
            {name: 'version', alias: 'v', description: 'show version'}

        ],
        watch: [
            {name: 'standalone', alias: 's', type: Boolean, description: 'watch standalone'}
        ],
        build: [
            {name: 'production', alias: 'p', type: Boolean, description: 'use compression, no map-files'}
        ]
    }

    constructor() {
        let rawdata = fs.readFileSync(path.join(__dirname, '..', '/package.json'))
        this.packageConfig = JSON.parse(rawdata)
        rawdata = fs.readFileSync(path.resolve('package.json'))
        const buildConfigRaw = JSON.parse(rawdata)
        const buildConfig = buildConfigRaw['t3-build'] || {}
        let options = {}

        try {
            let mainDefinitions = [{name: 'command', defaultOption: true}]
            const commands = commandLineArgs(mainDefinitions, {stopAtFirstUnknown: true})
            const argv = commands._unknown || []

            if (!commands.command) {

                const options = commandLineArgs(this.options.generic, {argv})

                Object.entries(options).forEach(([option, value]) => {
                    switch (option) {
                        case 'help':
                            this.showHelp()
                            process.exit()
                            break
                        case 'version':
                            console.log(`t3-build version ${this.packageConfig.version}`)
                            process.exit()
                            break
                    }
                })
            } else {
                switch (commands.command) {
                    case 'watch':
                        options = commandLineArgs(this.options.watch, {argv, stopAtFirstUnknown: true})
                        return this.loadSetup('watch',
                            {
                                ...buildConfig,
                                ...{
                                    standalone: options.standalone
                                }
                            })
                    case 'build':
                        options = commandLineArgs(this.options.build, {argv, stopAtFirstUnknown: true})
                        return this.loadSetup('build',
                            {
                                ...buildConfig,
                                ...{}
                            })
                    default:
                        console.error('unknown command')
                        this.showHelp()
                        process.exit()
                }
            }
        } catch (e) {
            console.log(e)
            this.showHelp()
            process.exit()
        }
        this.showHelp()
        process.exit()
    }

    loadSetup(mode, config) {
        console.log(config)
        return {
            ...config,
            ...{
                mode: mode,
                source:  process.env.T3BUILD_SRC || config.source || 'src',
                packages:  process.env.T3BUILD_PACKAGES || config.packages || 'packages',
                css:  process.env.T3BUILD_CSS || config.css || 'Css',
                js:  process.env.T3BUILD_JS || config.js || 'Js',
                projectPath: process.env.INIT_CWD || process.cwd(),
                getSourceDir: function () {
                    return path.resolve(path.join(this.projectPath, this.source))
                },
                getPackagesDir: function () {
                    return path.resolve(path.join(this.projectPath, this.packages))
                }
            }
        }
    }

    showHelp() {
        const sections = [
            {
                header: 'T3 builder', content: 'watcher and builder for typical TYPO3 project'
            },
            {
                header: 'Synopsis', content: '$ npx t3-build <options> <command> <options>'
            },
            {
                header: 'Generic options', optionList: this.options.generic
            },
            {
                header: 'Command List', content: this.commands
            },
            {
                header: 'Watch options', optionList: this.options.watch
            },
            {
                header: 'Build options', optionList: this.options.build
            }
        ]
        const usage = commandLineUsage(sections)

        console.log(usage)
    }
}





