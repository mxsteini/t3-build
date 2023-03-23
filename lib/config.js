import commandLineArgs from 'command-line-args'
import commandLineUsage from 'command-line-usage'
import path from 'path'
import fs from 'fs'

export default class Config {
    commands = [
        {name: 'watch', summary: 'Watch project.'},
        {name: 'build', summary: 'Build html, js, css.'},
        {name: 'init', summary: 'Future usage.'},
        {name: 'help', summary: 'Display this usage guide.'}
    ]

    constructor() {
        try {
            let mainDefinitions = [
                {name: 'command', defaultOption: true}
            ]
            const mainOptions = commandLineArgs(mainDefinitions, {stopAtFirstUnknown: true})
            const argv = mainOptions._unknown || []

            switch (mainOptions.command) {
                case 'watch':
                    return this.loadSetup('watch')
                case 'build':
                    return this.loadSetup('build')
                default:
                    console.error('unknown command')
                    this.showHelp()
                    process.exit()
            }
        } catch (e) {
            console.log(e)
            this.showHelp()
        }
    }

    loadSetup(mode) {
        const config = {
            mode: mode,
            source: process.env.T3BUILD_SRC || 'src',
            packages: process.env.T3BUILD_PACKAGES || 'packages',
            css: process.env.T3BUILD_CSS || 'Css',
            js: process.env.T3BUILD_JS || 'Js',
            projectPath: process.env.INIT_CWD,
            getSourceDir: function() {
                return path.resolve(path.join(this.projectPath, this.source))
            },
            getPackagesDir: function() {
                return path.resolve(path.join(this.projectPath, this.packages))
            }
        }
        return config
    }

    showHelp() {
        const sections = [
            {
                header: 'T3 builder',
                content: 'watcher and builder for typical TYPO3 project'
            },
            {
                header: 'Synopsis',
                content: '$ npx t3-build <options>'
            },
            {
                header: 'Command List',
                content: this.commands
            }
        ]
        const usage = commandLineUsage(sections)

        console.log(usage)
    }
}





