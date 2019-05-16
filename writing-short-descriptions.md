# Writing short descriptions

Short descriptions will be consistent with the following guidelines:

* Short descriptions may be formatted with only the HTML tags `<a>`, `<code>`, `<em>`, and `<strong>`.<sup>[1](#footnote1)</sup>
* `<a>` tags may use only on the `href` attribute pointing to absolute URLs.<sup>[1](#footnote1)</sup>
* Short descriptions must not exceed 180 displayed (rendered) characters.<sup>[1](#footnote1)</sup> Optimally, they should be 100 to 120 characters.
* The first sentence should be no more than 150 displayed characters.<sup>[1](#footnote1)</sup>
* Short descriptions text should stand alone (e.g., it should not refer to text, images, or other content outside the short description).
* Short descriptions must not mention support or standards status.
* Short descriptions should mention relevant keywords and topic areas (e.g., a property that affects layout should mention the word "layout" and perhaps the model in which it applies, such as "grid").
* Short descriptions should avoid the use of words like "specifies", "defines", or "determines" when the word "sets" is just as good and results in no loss of meaning.
* Short descriptions for shorthand properties should not name every property that they set.

* Short descriptions should describe, in the active voice, what a CSS property does. "The `some-property` CSS property sets the …" is a good pattern for starting a short description.
* Short descriptions should contain the name of the CSS property and the phrase "CSS property".
* Short descriptions should use the word "shorthand" if the property is a shorthand and link to a page about shorthands.

<a name="footnote1">1</a>: Checked by linter on this repo.

See https://github.com/mdn/data/issues/261 for details on how these guidelines were created.
