export const CHARACTERS = [
    {
        id: "kagami",
        name: "火神大我",
        stats: { two: 73, three: 47, drive: 92, defense: 75, clutch: 83, jump: 95 },
        skill: {
            name: "急停灌籃",
            type: "DUNK",
            desc: "本回合若為突破進攻，將直接觸發扣籃；命中仍依突破機制計算，並獲得小幅基礎命中率加成。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "itsuki",
        name: "伊月俊",
        stats: { two: 70, three: 61, drive: 67, defense: 72, clutch: 80, jump: 60 },
        skill: {
            name: "鷲之眼",
            type: "DEFENSE",
            desc: "使用技能時，有機率看穿對手的進攻；即使原本未守對，也會被視為守對，並正常進入干擾與火鍋判定流程。",
            canUseOn: ["DEFENSE"]
        }
    },
    {
        id: "hyuga",
        name: "日向順平",
        stats: { two: 66, three: 82, drive: 56, defense: 63, clutch: 86, jump: 62 },
        skill: {
            name: "關鍵射手",
            type: "BUFF",
            desc: "使用技能時，三分出手獲得中幅命中率加成；若比分接近或處於落後狀態，提升效果將進一步加強。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "mitobe",
        name: "水戶部凜之助",
        stats: { two: 84, three: 37, drive: 63, defense: 84, clutch: 64, jump: 78 },
        skill: {
            name: "鉤射",
            type: "OFFENSE",
            desc: "使用技能進行鉤射進攻（突破或中投情境）；獲得中幅命中率加成，並大幅降低被火鍋影響的機率。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "kiyoshi",
        name: "木吉鐵平",
        stats: { two: 76, three: 36, drive: 76, defense: 86, clutch: 63, jump: 73 },
        skill: {
            name: "鉗爪",
            type: "BUFF_DEFENSE",
            desc: "進攻：若本回合為突破或中投，最終命中率獲得中幅提升。防守：對手最終命中率中幅下降；若守對則額外下降；若進入火鍋判定，火鍋成功率獲得中幅提升。",
            canUseOn: ["OFFENSE", "DEFENSE"]
        }
    },
    {
        id: "aomine",
        name: "青峰大輝",
        stats: { two: 95, three: 55, drive: 89, defense: 77, clutch: 86, jump: 88 },
        skill: {
            name: "無定式投籃",
            type: "BUFF",
            desc: "本回合大幅降低對手干擾效果；若對手守錯，干擾效果將被進一步削弱。若本回合選擇中投，最終命中率額外獲得小幅提升。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "murasakibara",
        name: "紫原敦",
        nameShort: "紫原",
        stats: { two: 81, three: 39, drive: 86, defense: 95, clutch: 84, jump: 95 },
        skill: {
            name: "禁區支配",
            type: "DEFENSE",
            desc: "防守回合若守對，將依對手出手距離提升火鍋成功率：近距離提升幅度最大，中距離次之，遠距離提升最小。",
            canUseOn: ["DEFENSE"]
        }
    },
    {
        id: "midorima",
        name: "綠間真太郎",
        nameShort: "綠間",
        stats: { two: 82, three: 95, drive: 63, defense: 80, clutch: 85, jump: 75 },
        skill: {
            name: "高彈道三分",
            type: "FORCED_3PT",
            desc: "本回合三分必進；但仍可能被火鍋蓋掉。冷卻時間固定較長。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "akashi",
        name: "赤司征十郎",
        nameShort: "赤司",
        stats: { two: 87, three: 70, drive: 75, defense: 75, clutch: 95, jump: 78 },
        skill: {
            name: "不敗帝王",
            type: "BUFF_DEFENSE",
            desc: "進攻：本回合所有出手的最終命中率獲得中幅提升。防守：本回合全面壓制對手最終命中率；若守對則額外壓制；若進入火鍋判定，火鍋成功率獲得小幅提升。",
            canUseOn: ["OFFENSE", "DEFENSE"]
        }
    },
    {
        id: "kise",
        name: "黃瀨涼太",
        nameShort: "黃瀨",
        stats: { two: 84, three: 70, drive: 80, defense: 78, clutch: 84, jump: 84 },
        skill: {
            name: "動作模仿",
            type: "BUFF",
            desc: "若本回合出手類型與對手上一回合相同，基礎命中率獲得中幅提升；若為突破，扣籃觸發率額外小幅提升。若本回合得分成功，下一次進攻獲得小幅士氣加成（不可疊加）。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "kasamatsu",
        name: "笠松幸男",
        stats: { two: 70, three: 78, drive: 64, defense: 70, clutch: 83, jump: 50 },
        skill: {
            name: "隊長的節奏",
            type: "BUFF",
            desc: "本回合最終命中率獲得中幅提升；若比分落後或分差接近，提升效果將進一步加強。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "moriyama",
        name: "森山由孝",
        nameShort: "森山",
        stats: { two: 72, three: 80, drive: 50, defense: 65, clutch: 78, jump: 65 },
        skill: {
            name: "定點狙擊",
            type: "BUFF",
            desc: "本回合若選擇三分，基礎命中率獲得中幅提升；若處於關鍵時刻，提升效果將再度加強。",
            canUseOn: ["OFFENSE"]
        }
    },
    {
        id: "hayakawa",
        name: "早川充洋",
        nameShort: "早川",
        stats: { two: 73, three: 40, drive: 65, defense: 80, clutch: 70, jump: 82 },
        skill: {
            name: "拼搶壓迫",
            type: "DEFENSE",
            desc: "防守時若判斷正確，將大幅提升壓迫強度，並顯著提高火鍋威脅。",
            canUseOn: ["DEFENSE"]
        }
    },
    {
        id: "kobori",
        name: "小堀浩志",
        nameShort: "小堀",
        stats: { two: 78, three: 32, drive: 66, defense: 84, clutch: 74, jump: 76 },
        skill: {
            name: "禁區基礎",
            type: "BUFF_DEFENSE",
            desc: "進攻時若選擇突破或中投，提升得分穩定性並降低被火鍋影響。防守時若判斷正確，提升禁區威懾與火鍋成功率。",
            canUseOn: ["OFFENSE", "DEFENSE"]
        }
    }
];
