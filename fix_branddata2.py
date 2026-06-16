with open(r'C:\sellout-dashboard\src\views\Dashboard.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: replace comment-laden realize: realize with clean realize: realize
old = '      realize: realize,  // ← property key is `realize` (destructured var is `realisasi`)\n      achievement,'
new = '      realize: realize,\n      achievement,'

if old in content:
    content = content.replace(old, new)
    with open(r'C:\sellout-dashboard\src\views\Dashboard.vue', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed.")
else:
    print("Not found. Searching...")
    idx = content.find('realize: realize')
    print(f"  realize: realize found at idx {idx}")
    if idx != -1:
        print(repr(content[idx:idx+80]))