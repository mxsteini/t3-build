export default class posthtmlStripTags {
    process(options) {
        return function (tree) {
            tree.match(options.tags.map(tag => ({tag: tag})), node => {
                return node.content;
            })
            return tree
        }
    }
}
