import subprocess, re
commit='e7f4ecd'
res = subprocess.run(['git', 'show', f'{commit}:index.html'], capture_output=True, text=True)
text = res.stdout
for tab in ['tabA','tabB','tabC','tabD']:
    print('---', tab, '---')
    pattern = re.compile(rf'(?:<div class="tab-panel active" id="{tab}" role="tabpanel">|<div class="tab-panel" id="{tab}" role="tabpanel">)(.*?)(?=<div class="tab-panel" id="tab[A-D]" role="tabpanel">|</div>\s*</div>\s*</div>\s*</div>|$)', re.S)
    m = pattern.search(text)
    if m:
        print(m.group(0))
    else:
        print('NOT FOUND')
