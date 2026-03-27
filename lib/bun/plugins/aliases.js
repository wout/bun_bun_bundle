import {join} from 'path'

const REGEX = /(url\(\s*['"]?|(?<!\w)['"])\$\//g

// Resolves `$/` root aliases in CSS url() references and JS/CSS imports.
// e.g. url('$/images/foo.png') → url('/absolute/src/images/foo.png')
//      import x from '$/utils/x.js' → import x from '/absolute/src/utils/x.js'
//      @import '$/components/button.css' → @import '/absolute/src/components/button.css'
export default function aliases({root}) {
  const srcDir = join(root, 'src')
  return content => content.replace(REGEX, `$1${srcDir}/`)
}
