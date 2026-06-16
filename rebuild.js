const fs = require('fs');
let c = fs.readFileSync('C:/sellout-dashboard/src/views/Dashboard.vue', 'utf8');
const lines = c.split('\n');
console.log('Total lines:', lines.length);

// Correct structure:
// Lines 0-265 (1-266): CORRECT template  -> keep
// Lines 266 (267): blank
// Lines 267-489 (268-490): FIRST script -> keep (has filteredRows + brandData from store, but missing getBreakDataL1, etc.)
// Lines 490-1062 (491-1063): BAD duplicate template + broken script -> REMOVE
// Lines 1062 (1063): blank
// Lines 1063+ (1064+): CORRECT style section -> keep

// Check what's in the style section
console.log('Line 1064:', lines[1063]);
console.log('Line 266 (</template>):', lines[265]);
console.log('Line 267 (blank):', lines[266]);
console.log('Line 268 (script start):', lines[267]);
console.log('Line 490 (script end):', lines[489]);
console.log('Line 491 (bad start):', lines[490]);

// Keep: 0-266 (template + blank)
// Keep: 267-489 (first script)
// Add: </script>
// Add: blank
// Keep: 1063+ (style)

const newLines = [
  ...lines.slice(0, 266),    // 1-266: template + blank (indices 0-265)
  '</script>',                  // close first script
  '',                          // blank
  ...lines.slice(1063),        // 1064+: style section (index 1063+)
];

const newC = newLines.join('\n');
fs.writeFileSync('C:/sellout-dashboard/src/views/Dashboard.vue', newC, 'utf8');
console.log('New file size:', newC.length, 'lines:', newLines.length);

// Verify
const si = newC.indexOf('<script setup>');
const scrEnd = newC.indexOf('</script>');
const scr = newC.substring(si + 14, scrEnd);
console.log('Script section has template?', scr.includes('<template'));
console.log('Script length:', scr.length, 'lines:', scr.split('\n').length);
const clean = scr.replace(/^import .*$/gm, '');
try { new Function(clean); console.log('Script compiles OK'); } catch(e) { console.log('Compile Error:', e.message.split('\n')[0]); }
console.log('Template count:', (newC.match(/<template>/g)||[]).length, 'Script count:', (newC.match(/<script/g)||[]).length, 'Style count:', (newC.match(/<style/g)||[]).length);
