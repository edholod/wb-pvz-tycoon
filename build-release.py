"""Embed maintained candidate sources in the legacy cloud launcher. No dependencies."""
from pathlib import Path
p=Path(__file__).parent
html=(p/'index.html').read_text()
a='<!-- BEGIN RELEASE212 -->';b='<!-- END RELEASE212 -->'
if a in html:html=html[:html.index(a)]+html[html.index(b)+len(b):]
module=(p/'modules/release212.js').read_text();css=(p/'modules/release212.css').read_text()
block=a+'\n<style>\n'+css+'\n</style>\n<script type="application/x-wbpvz">\n'+module+'\n</script>\n'+b
html=html.replace('</body></html>',block+'\n</body></html>')
(p/'index.html').write_text(html)

cloud=(p/'cloud-sync.js').read_text()
start='/* BEGIN STORAGE212 */';end='/* END STORAGE212 */'
if start in cloud:cloud=cloud[cloud.index(end)+len(end):].lstrip('\n')
codec=start+'\n'+(p/'vendor/lz-string-1.5.0.min.js').read_text()+'\n'+(p/'modules/storage-codec.js').read_text()+'\n'+end+'\n'
(p/'cloud-sync.js').write_text(codec+cloud)
