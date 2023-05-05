import path from 'path'
import fs from 'fs'

export default class posthtmlStyleToFile {
    process(options) {
        options = options || {path: './result.css'};

        var buf = '';

        return function (tree) {
            tree.match({tag: 'style'}, function (node) {
                buf += node.content[0].trim() || '';

                if (options.removeStyle === 'tag' || options.removeStyle === 'all') {
                    return '';
                }

                return node;
            });

            tree.match({attrs: {style: true}}, function (node) {
                var cls = '';
                node.attrs.class &&
                (cls = '.' + (node.attrs.class.split(' ')).join('.'));

                buf += '\n' +
                    node.tag +
                    (node.attrs.id ? ('#' + node.attrs.id) : '') +
                    cls + '{' + node.attrs.style + '}';

                if (options.removeStyle === 'attrs' || options.removeStyle === 'all') {
                    delete node.attrs.style;
                }

                return node;
            });

            if (!fs.existsSync(path.dirname(path.resolve(options.path)))) {
                fs.mkdirSync(path.dirname(path.resolve(options.path)), {
                    recursive: true,
                })
            }

            fs.writeFileSync(path.resolve(options.path), buf, 'utf8', error => {
                if (error) throw error;
            });

            return tree;
        };
    }
}
