const REGEX = /(url\(\s*['"]?|(?<!\w)['"][^'"]*)\$\//g

// Resolves `$/` root aliases in CSS url() references and JS/CSS imports.
// e.g. url('$/app/assets/images/foo.png') → url('/absolute/root/app/assets/images/foo.png')
//      import x from '$/lib/utils.js' → import x from '/absolute/root/lib/utils.js'
//      @import '$/app/assets/css/reset.css' → @import '/absolute/root/app/assets/css/reset.css'
export default function aliases({root}) {
  return content => content.replace(REGEX, `$1${root}/`)
}
