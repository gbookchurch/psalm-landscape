/* web-0.7 改寫版題庫（2026-11-17）。原始來源：02_題庫與原型/questions_v22_原型參照.json。
 * 改寫重點：生活化的情境、稱呼統一用「神」、每題補上中間選項、傷痛與認罪不再有 -2（詩篇在這兩面向沒有負值）、
 * Q19 換成計分題（與神的距離）。逐題對照與說明見「題目改寫對照_web07.csv」。定稿後請同步回原始題庫檔。 */
window.QUESTIONS=[
 {
  "id": "Q1",
  "text": "早上醒來、還沒拿起手機的那幾秒，心裡通常是什麼感覺？",
  "options": [
   {
    "text": "一醒來就覺得好重，不太想面對今天",
    "scores": {
     "A": -2
    }
   },
   {
    "text": "有點累，提不起勁",
    "scores": {
     "A": -1
    }
   },
   {
    "text": "沒什麼特別的感覺，就是又一天",
    "scores": {
     "A": 0
    }
   },
   {
    "text": "還算平靜，可以慢慢開始",
    "scores": {
     "A": 1
    }
   },
   {
    "text": "心裡是輕的，對今天有點期待",
    "scores": {
     "A": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q2",
  "text": "晚上回到家、終於可以一個人的時候，最常湧上來的感受是？",
  "options": [
   {
    "text": "一放鬆下來就想哭，或心裡空空的",
    "scores": {
     "A": -2
    }
   },
   {
    "text": "很累，有點煩悶",
    "scores": {
     "A": -1
    }
   },
   {
    "text": "還好，沒什麼特別的",
    "scores": {
     "A": 0
    }
   },
   {
    "text": "鬆一口氣，大致安穩",
    "scores": {
     "A": 1
    }
   },
   {
    "text": "心裡滿滿的，想謝謝今天",
    "scores": {
     "A": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q3",
  "text": "最近有話想跟神說的時候，通常是怎麼說出來的？",
  "options": [
   {
    "text": "說不出口，只能靜靜坐著",
    "scores": {
     "E": -2
    }
   },
   {
    "text": "在心裡默默講幾句",
    "scores": {
     "E": -1
    }
   },
   {
    "text": "跟平常一樣，簡單說說",
    "scores": {
     "E": 0
    }
   },
   {
    "text": "會把心裡的話一件一件說完",
    "scores": {
     "E": 1
    }
   },
   {
    "text": "忍不住說得很大聲，或一直講、一直唱",
    "scores": {
     "E": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q4",
  "text": "最近禱告完、說了「阿們」之後，你的感覺比較像？",
  "options": [
   {
    "text": "像對著天花板說話，好像沒有人在聽",
    "scores": {
     "B": -2
    }
   },
   {
    "text": "知道神在，但感覺隔了一層",
    "scores": {
     "B": -1
    }
   },
   {
    "text": "說不上近或遠，沒有特別的感覺",
    "scores": {
     "B": 0
    }
   },
   {
    "text": "心裡安靜下來，覺得神有聽見",
    "scores": {
     "B": 1
    }
   },
   {
    "text": "很真實地感覺到神就在身邊",
    "scores": {
     "B": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q5",
  "text": "最近遇到煩心的事，你會覺得神在哪裡？",
  "options": [
   {
    "text": "好像不在，我得自己撐",
    "scores": {
     "B": -2
    }
   },
   {
    "text": "應該在，但離我有點遠",
    "scores": {
     "B": -1
    }
   },
   {
    "text": "沒有特別去想這件事",
    "scores": {
     "B": 0
    }
   },
   {
    "text": "在旁邊，只是比較安靜",
    "scores": {
     "B": 1
    }
   },
   {
    "text": "就在身邊，跟我一起面對",
    "scores": {
     "B": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q6",
  "text": "最近通勤、洗澡這種放空的時候，腦袋最常跑去哪裡？",
  "options": [
   {
    "text": "很久以前的事，那些回不去的日子",
    "scores": {
     "C": -2
    }
   },
   {
    "text": "最近發生的事，一直在腦中重播",
    "scores": {
     "C": -1
    }
   },
   {
    "text": "就是眼前的事，今天和明天要做什麼",
    "scores": {
     "C": 0
    }
   },
   {
    "text": "接下來幾個月要面對的事",
    "scores": {
     "C": 1
    }
   },
   {
    "text": "很遠的將來，希望人生走到哪裡",
    "scores": {
     "C": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q7",
  "text": "最近跟朋友聊天，你最常聊到的是？",
  "options": [
   {
    "text": "以前的日子，那時候多好或多難",
    "scores": {
     "C": -2
    }
   },
   {
    "text": "最近剛發生的事",
    "scores": {
     "C": -1
    }
   },
   {
    "text": "眼前正在忙的事",
    "scores": {
     "C": 0
    }
   },
   {
    "text": "接下來的計畫，或要做的決定",
    "scores": {
     "C": 1
    }
   },
   {
    "text": "很遠的夢想，或對未來的想像",
    "scores": {
     "C": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q8",
  "text": "最近有沒有哪個人或哪件事，一想到就讓你胸口一緊？",
  "options": [
   {
    "text": "最近沒有這樣的人或事",
    "scores": {
     "D": 0
    }
   },
   {
    "text": "有些小摩擦或壓力，但還撐得住",
    "scores": {
     "D": 1
    }
   },
   {
    "text": "有件事真的傷到我，到現在還在影響我",
    "scores": {
     "D": 2
    }
   },
   {
    "text": "我被誤會、被不公平地對待",
    "scores": {
     "D": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q9",
  "text": "最近你待最久的地方（家裡、職場、學校或教會），給你的感覺是？",
  "options": [
   {
    "text": "安全，可以放心做自己",
    "scores": {
     "D": 0
    }
   },
   {
    "text": "大致還好，只是忙一點、累一點",
    "scores": {
     "D": 0
    }
   },
   {
    "text": "有具體的壓力，或讓我不舒服的人",
    "scores": {
     "D": 1
    }
   },
   {
    "text": "每天都得提防，覺得被針對或被排擠",
    "scores": {
     "D": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q10",
  "text": "最近在聚會唱詩的時候，你比較像？",
  "options": [
   {
    "text": "唱不出來，只是站著",
    "scores": {
     "E": -2
    }
   },
   {
    "text": "小聲跟著唱",
    "scores": {
     "E": -1
    }
   },
   {
    "text": "跟平常一樣唱",
    "scores": {
     "E": 0
    }
   },
   {
    "text": "很投入，會把歌詞唱給神聽",
    "scores": {
     "E": 1
    }
   },
   {
    "text": "忍不住大聲唱、舉手，或流淚",
    "scores": {
     "E": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q11",
  "text": "如果把最近想對神說的話寫下來，大概會有多長？",
  "options": [
   {
    "text": "一片空白，寫不出來",
    "scores": {
     "E": -2
    }
   },
   {
    "text": "一兩句話",
    "scores": {
     "E": -1
    }
   },
   {
    "text": "一小段",
    "scores": {
     "E": 0
    }
   },
   {
    "text": "一封信",
    "scores": {
     "E": 1
    }
   },
   {
    "text": "好幾頁，停不下來",
    "scores": {
     "E": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q12",
  "text": "最近禱告的時候，你最常為誰禱告？",
  "options": [
   {
    "text": "幾乎都是為自己",
    "scores": {
     "F": -2
    }
   },
   {
    "text": "大多為自己，偶爾帶到家人朋友",
    "scores": {
     "F": -1
    }
   },
   {
    "text": "自己和身邊的人差不多一半一半",
    "scores": {
     "F": 0
    }
   },
   {
    "text": "常為家人、朋友或小組禱告",
    "scores": {
     "F": 1
    }
   },
   {
    "text": "常為教會、城市或這個世界禱告",
    "scores": {
     "F": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q13",
  "text": "最近最讓你掛心的事，比較是？",
  "options": [
   {
    "text": "我自己的事",
    "scores": {
     "F": -2
    }
   },
   {
    "text": "主要是我的事，但也牽涉到別人",
    "scores": {
     "F": -1
    }
   },
   {
    "text": "我和身邊的人一起面對的事",
    "scores": {
     "F": 0
    }
   },
   {
    "text": "我在乎的一群人正在經歷的事",
    "scores": {
     "F": 1
    }
   },
   {
    "text": "整個群體（教會、社會、這個世代）的事",
    "scores": {
     "F": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q14",
  "text": "想到目前的處境，你看得見出口嗎？",
  "options": [
   {
    "text": "現在真的看不到",
    "scores": {
     "G": -2
    }
   },
   {
    "text": "理智上知道可能有，但感覺不到",
    "scores": {
     "G": -1
    }
   },
   {
    "text": "不確定，還在等",
    "scores": {
     "G": 0
    }
   },
   {
    "text": "開始看見一點可能",
    "scores": {
     "G": 1
    }
   },
   {
    "text": "已經看見方向，心裡有把握",
    "scores": {
     "G": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q15",
  "text": "如果朋友問你「接下來會好起來嗎？」，你會怎麼回答？",
  "options": [
   {
    "text": "「我不覺得會。」",
    "scores": {
     "G": -2
    }
   },
   {
    "text": "「我不知道，現在很難想像。」",
    "scores": {
     "G": -1
    }
   },
   {
    "text": "「再看看吧。」",
    "scores": {
     "G": 0
    }
   },
   {
    "text": "「應該會慢慢好起來。」",
    "scores": {
     "G": 1
    }
   },
   {
    "text": "「會的，我已經看到神在做事。」",
    "scores": {
     "G": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q16",
  "text": "如果用一種光線形容你心裡的盼望，比較像？",
  "options": [
   {
    "text": "完全的黑夜",
    "scores": {
     "G": -2
    }
   },
   {
    "text": "黑夜裡很遠的一點星光",
    "scores": {
     "G": -1
    }
   },
   {
    "text": "天快亮前，灰濛濛的",
    "scores": {
     "G": 0
    }
   },
   {
    "text": "清晨剛透出來的光",
    "scores": {
     "G": 1
    }
   },
   {
    "text": "白天，光很清楚",
    "scores": {
     "G": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q17",
  "text": "最近夜深人靜時，會不會有哪件自己做過的事浮上心頭？",
  "options": [
   {
    "text": "沒有特別的事",
    "scores": {
     "H": 0
    }
   },
   {
    "text": "有些小地方，覺得可以做得更好",
    "scores": {
     "H": 1
    }
   },
   {
    "text": "有件事想跟某人道歉，或把話說清楚",
    "scores": {
     "H": 1
    }
   },
   {
    "text": "有件事讓我很懊悔，一直放不下",
    "scores": {
     "H": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q18",
  "text": "最近你有沒有想向神或某個人承認錯誤、請求原諒？",
  "options": [
   {
    "text": "最近沒有這種感覺",
    "scores": {
     "H": 0
    }
   },
   {
    "text": "有想過，但我不覺得是我的問題",
    "scores": {
     "H": 0
    }
   },
   {
    "text": "有，但還沒準備好開口",
    "scores": {
     "H": 1
    }
   },
   {
    "text": "有，我正在面對，想好好修復",
    "scores": {
     "H": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q19",
  "text": "最近讀經或安靜下來的時候，你的感覺比較像？",
  "options": [
   {
    "text": "很久沒有這樣的時間，也不太想",
    "scores": {
     "B": -2
    }
   },
   {
    "text": "讀了，但覺得字句很遙遠",
    "scores": {
     "B": -1
    }
   },
   {
    "text": "照著讀，沒有特別的感覺",
    "scores": {
     "B": 0
    }
   },
   {
    "text": "偶爾有一句話觸動我",
    "scores": {
     "B": 1
    }
   },
   {
    "text": "常常覺得神在對我說話",
    "scores": {
     "B": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 },
 {
  "id": "Q20",
  "text": "如果用一個畫面形容最近的心情和說話的樣子，哪個比較像？",
  "options": [
   {
    "text": "安靜坐著，心裡很沉",
    "scores": {
     "A": -2,
     "E": -2
    }
   },
   {
    "text": "難過地向神大聲哭喊",
    "scores": {
     "A": -2,
     "E": 2
    }
   },
   {
    "text": "照常過日子，沒有太大起伏",
    "scores": {
     "A": 0,
     "E": 0
    }
   },
   {
    "text": "一個人散步，心慢慢安穩下來",
    "scores": {
     "A": 1,
     "E": -1
    }
   },
   {
    "text": "跟大家一起開心地大聲唱",
    "scores": {
     "A": 2,
     "E": 2
    }
   }
  ],
  "skip_allowed": true,
  "skip_text": "不想回答／不適用"
 }
];
