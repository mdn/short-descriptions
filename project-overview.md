This document describes the project to make "CSS short descriptions" available to third-party tools such as code editors or developer tools.

The "short description" is the opening sentence or two of a CSS property reference page. It gives a very short overview of the property. It's also known as a summary.

It follows a reasonably consistent pattern:

> The **`foo`** [CSS](https://developer.mozilla.org/CSS) property is... It is related to the [`bar`](https://developer.mozilla.org/docs/Web/CSS/bar) property...

For example:

> The **`box-shadow`** [CSS](https://developer.mozilla.org/CSS) property is used to add shadow effects around an element's frame. You can specify multiple effects separated by commas if you wish to do so. A box shadow is described by X and Y offsets relative to the element, blur and spread radii, and color.

> The **`margin`** [CSS](https://developer.mozilla.org/CSS) property sets the margin area on all four sides of an element. It is a shorthand for setting all individual margins at once: [`margin-top`](https://developer.mozilla.org/docs/Web/CSS/margin-top), [`margin-right`](https://developer.mozilla.org/docs/Web/CSS/margin-right), [`margin-bottom`](https://developer.mozilla.org/docs/Web/CSS/margin-bottom), and [`margin-left`](https://developer.mozilla.org/docs/Web/CSS/margin-left).

Currently the short description is just part of the Wiki document for the property. It's been proposed (e.g. https://github.com/mdn/data/issues/199) to include the short description in the JSON data structures in the [mdn/data](https://github.com/mdn/data/) GitHub repository.

The rationale for doing this is that it makes it much easier for external tools to embed the short description. For example, an editor like VSCode could fetch the short description and display it in a contextual popup along with other useful information like browser compatibility. External tools can (and do) do this already by scraping the Wiki, but this is quite unreliable.

The rest of this document is split into the following sections:

* **Interface**: this describes, at a high level, how third party tools will be presented with short descriptions.
* **Implementation**: this describes what we will do under the surface, to implement this interface.
* **Work items**: this starts to break down the things that need to happen in the implementation.

## Interface

**Note that the public interface of this project is at a very early stage and is (very) subject to change.**

### Initial proposal

Our initial proposal was to import CSS short descriptions from the MDN wiki and into the [mdn/data](https://github.com/mdn/data/) GitHub repository. This repository is published as an npm package, [mdn-data](https://www.npmjs.com/package/mdn-data), and this could be used by third parties to access short descriptions, just as it is currently used by third parties to access CSS syntax.

We don't think this is a viable approach any more, because mdn/data is published under the CC0 license, while [MDN prose content is published under the CC-BY-SA license](https://developer.mozilla.org/en-US/docs/MDN/About#Copyrights_and_licenses).

### Current proposal

The current proposal is to create a new GitHub repository called mdn/short-descriptions. This contains the CSS short descriptions scraped from the Wiki under a CC-BY-SA.

We would then publish a new npm package that *combines* the data from mdn/data and the content from mdn/short-descriptions. This package would be CC-BY-SA licensed and called "mdn-docs".

```
    GitHub                         npm
   ------------------------------------------------------
                               ___________________
                               |                 |
    mdn/data------------------>| mdn-data (CC0)  |
    (CC0)      |               |_________________|
               |
               |               _______________________
                -------------->|                     |
                               | mdn-docs (CC-BY-SA) |
    mdn/short-descriptions --->|_____________________|
    (CC-BY-SA)

```

The internal structure of this new package would copy the structure used in [browser-compat-data](https://github.com/mdn/browser-compat-data). For example, you could access the short description for the `margin` property using a query like:

`css.properties.margin.__docs.short_description`

Open questions:
* What should the npm package be called? `mdn-docs`? `mdn-content`? `mdn-short-descriptions`?
* Should the npm package include the contents of mdn/data, or not? That is, should we provide one place where consumers can get data and short descriptions, or should we make them separate packages?
* Should we in general move towards a common way to organize npm packages? Meaning, should we aim to restructure mdn/data to follow the "BCD structure"?

## Implementation

This section describes what happens under the surface: how we will arrange for the publication of an npm package containing short descriptions, that have been validated to ensure they meet our guidelines.

One major decision we've made is: the source for the short descriptions will continue to be the MDN Wiki pages. That is, we won't copy them from the Wiki once and then maintain them on GitHub. Instead, we will copy them and then update them from the MDN Wiki whenever we want to make a new release. The contribution workflow for CSS short descriptions will ontinue to be the Wiki. For background on this decision, see [this Discourse thread](https://discourse.mozilla.org/t/proposal-including-css-short-descriptions-in-mdn-data/30500/).

In a little more detail, here's how we expect this to work: 

* Define guidelines for CSS short descriptions: how long they should be, what sort of content they should contain, and so on. Some of these can be checked by a linter, some need a human.
* Update all the MDN Wiki pages so they meet these guidelines.
* Scrape short descriptions from the Wiki into the `mdn/short-descriptions` GitHub repo.
* Publish the `mdn-docs` npm package that combines `mdn/short-descriptions` and `mdn/data`.

Subsequently, on a regular schedule:

* Scrape the MDN Wiki for updated short descriptions.
* If any short descriptions are new or changed, do some automated linting against our guidelines.
* If there are errors here, manually fix them by editing the Wiki pages and try again.
* When there are no linting errors, prepare a PR against `mdn/short-descriptions` that updates the content with the changes from the MDN Wiki.
* Review the PR manually. If there are any problems,  manually fix them by editing the Wiki pages and try again.
* Once the PR looks good, merge it into `mdn/short-descriptions` and publish a new version of the npm `mdn-docs` package.

## Work items

* Create the short-descriptions repo, with the appropriate basic docs (README, LICENSE).
* Write a document describing guidelines for CSS short descriptions, and add it to the repo.
* Write a schema for the repo defining the structure of the content it contains.
* Update the CSS short descriptions in the Wiki so they meet our documented guidelines.
* Write a script that can:
    * fetch CSS short descriptions from MDN Wiki pages
    * if the short description does not already exist in the GitHub repo, or does not match the one in the GitHub repo, then:
    * validate the text from the Wiki against the guidelines, as far as that's practical in a script. If there is an error, log it. Otherwise add the new description to a changelist.
    * create a PR for mdn/short-descriptions that includes all changelists.
* Write a script that can create a new release of the `mdn-docs` npm package, from the short descriptions in `mdn/short-descriptions` and the data in `mdn/data`.
