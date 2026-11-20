/* 九種光景的天色（web-0.41，依「九種天色提案」設計稿）
   top、mid：結果頁和分享圖紙底上方的淡天色，從 top 漸層到 mid，再回到米色紙。底色都很淺，疊印的插畫不會變暗。
   chip：天空圓章，c1→c2 是天空漸層；sun 是太陽或月亮的顏色；y 是它的高度（0 最上、100 最下）；
   kind：sun 太陽、half 半沉在地平線、moon 月亮、cloud 雲遮太陽。 */
window.PSALM_SKY = {
  '1 晨光':   { name: '淡金',     top: '#FBE3AE', mid: '#FDF0D2', c1: '#FFDD8C', c2: '#FFF4D6', sun: '#F2A93B', y: 62, kind: 'sun' },
  '2 正午':   { name: '清亮藍',   top: '#D7ECF1', mid: '#EEF6F0', c1: '#9ED2EA', c2: '#F6F1CF', sun: '#FFC83D', y: 22, kind: 'sun' },
  '3 起風':   { name: '灰綠',     top: '#DCE5D6', mid: '#ECF0E3', c1: '#AFC2AE', c2: '#E9EEDF', sun: '#F4E3A2', y: 38, kind: 'cloud' },
  '4 黃昏':   { name: '杏橘',     top: '#FAD7B5', mid: '#FCE8D2', c1: '#F4A66C', c2: '#FCE3C6', sun: '#EB7A2E', y: 64, kind: 'sun' },
  '5 日落':   { name: '粉橘',     top: '#F5CDBE', mid: '#FAE2D6', c1: '#E5856A', c2: '#F8D3BE', sun: '#D9512A', y: 84, kind: 'half' },
  '6 入夜':   { name: '淡紫灰',   top: '#DFD8EA', mid: '#EEE9F0', c1: '#978DBA', c2: '#E5D9E2', sun: '#F3EEDC', y: 30, kind: 'moon' },
  '7 深夜':   { name: '淡靛藍',   top: '#D6DCEC', mid: '#E9ECF2', c1: '#3F4B7A', c2: '#7F88AF', sun: '#F6F3E6', y: 24, kind: 'moon' },
  '8 夜將盡': { name: '藍灰透暖', top: '#DAE1EC', mid: '#EFE7E0', c1: '#6E7FA7', c2: '#F1C7A2', sun: '#FBE7C9', y: 78, kind: 'moon' },
  '9 破曉':   { name: '珍珠桃',   top: '#EEDDEB', mid: '#FCE5D2', c1: '#E3D1E6', c2: '#FFDDBA', sun: '#F6AE52', y: 86, kind: 'half' },
};
