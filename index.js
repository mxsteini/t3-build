import Config from './lib/config.js'
import Check from './lib/check.js'
import Init from './lib/init.js'
import dotenv from 'dotenv'
import Build from './lib/build.js'
import Watch from './lib/watch.js'
export default class Main {
    config = {}

    constructor() {
        dotenv.config()
        this.config = new Config()

        const check = new Check()

        if (check.checkDirectories(this.config)) {
            switch (this.config.mode) {
                case 'init':
                    new Init(this.config)
                    break
                case 'build':
                    new Build(this.config)
                    break
                case 'watch':
                    new Build(this.config)
                    new Watch(this.config)
                    break
            }
        }
        return true
    }
}





