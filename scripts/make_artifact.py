# Turns dist-single/index.html into an HTML fragment for the shareable link
# (the host page supplies <html>/<head>/<body> and the charset/viewport tags).
import re
s = open('dist-single/index.html').read()
head_end = s.index('</head>')
head = s[s.index('<head>') + 6:head_end]
body = s[s.index('<body>', head_end) + 6:s.rindex('</body>')]
head = re.sub(r'<meta (charset|name="viewport")[^>]*>', '', head)
title = re.search(r'<title>.*?</title>', head).group(0)
open('dist-single/artifact.html', 'w').write(title + '\n' + head.replace(title, '') + '\n' + body)
