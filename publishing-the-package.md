# Publishing mdn-short-descriptions on npm

Project owners can publish mdn-short-descriptions on npm by following these steps:

1. Figure out the next version number by looking at [past releases](https://github.com/mdn/short-descriptions/releases). The project is in alpha, so we're using only patch versions.
2. On an updated and clean master branch, `run npm version patch -m "Nth alpha version"`. Locally, this updates `package.json`, creates a new commit, and creates a new release tag (see the docs for [npm version](https://docs.npmjs.com/cli/version)).
3. Push the commit to master: `git push origin master`.
4. Check if the commit passes on [Travis CI](https://travis-ci.org/mdn/short-descriptions).
5. If Travis passes, push the git tag: `git push origin v0.0.X`. This step will trigger Travis to publish to npm automatically (see our [.travis.yml file](https://github.com/mdn/short-descriptions/blob/master/.travis.yml)).
6. Check [Travis CI](https://travis-ci.org/mdn/short-descriptions) again for the tag build and also check [mdn-short-descriptions on npm](https://www.npmjs.com/package/mdn-short-descriptions) to see if the release shows up correctly once Travis has finished its work.
7. Create a new [release on GitHub](https://github.com/mdn/short-descriptions/releases) and document changes.
