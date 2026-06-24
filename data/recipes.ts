import { MATERIAL_PRICE_MULTIPLIER } from "@/data/constants";
import { getMaterial, computeBaseMaterialPrice } from "@/data/materials";

export interface RecipeDef {
    id: string;
    name: string;
    category: "food" | "processed" | "drink" | "medicine" | "craft";
    ingredients: { materialId: string; qty: number }[];
    baseCost: number;
    sellPrice: number;
}

// baseCost / sellPrice は材料費から自動算出するため RAW では持たない。
type RawRecipe = Omit<RecipeDef, "baseCost" | "sellPrice">;

const RAW_RECIPES: RawRecipe[] = [
    // 食品
    { id: "bread", name: "パン", category: "food", ingredients: [{ materialId: "wheat", qty: 2 }] },
    {
        id: "potato_salad",
        name: "ポテトサラダ",
        category: "food",
        ingredients: [
            { materialId: "potato", qty: 1 },
            { materialId: "tomato", qty: 1 },
        ],
    },
    {
        id: "fish_sand",
        name: "魚サンド",
        category: "food",
        ingredients: [
            { materialId: "wheat", qty: 1 },
            { materialId: "smallfish", qty: 1 },
        ],
    },
    {
        id: "shrimp_sand",
        name: "エビサンド",
        category: "food",
        ingredients: [
            { materialId: "wheat", qty: 1 },
            { materialId: "shrimp", qty: 1 },
        ],
    },
    {
        id: "seafood",
        name: "海鮮プレート",
        category: "food",
        ingredients: [
            { materialId: "mackerel", qty: 1 },
            { materialId: "shrimp", qty: 1 },
            { materialId: "seaweed", qty: 1 },
        ],
    },
    // 加工食品
    {
        id: "mackerel_can",
        name: "サバ缶",
        category: "processed",
        ingredients: [
            { materialId: "mackerel", qty: 1 },
            { materialId: "iron", qty: 1 },
        ],
    },
    {
        id: "tuna_can",
        name: "ツナ缶",
        category: "processed",
        ingredients: [
            { materialId: "tuna", qty: 1 },
            { materialId: "iron", qty: 1 },
        ],
    },
    {
        id: "preserved",
        name: "保存食セット",
        category: "processed",
        ingredients: [
            { materialId: "smallfish", qty: 1 },
            { materialId: "seaweed", qty: 1 },
            { materialId: "coal", qty: 1 },
        ],
    },
    {
        id: "veg_soup",
        name: "野菜スープ",
        category: "processed",
        ingredients: [
            { materialId: "potato", qty: 1 },
            { materialId: "tomato", qty: 1 },
            { materialId: "herb", qty: 1 },
        ],
    },
    {
        id: "premium_food",
        name: "高級保存食",
        category: "processed",
        ingredients: [
            { materialId: "tuna", qty: 1 },
            { materialId: "seaweed", qty: 1 },
            { materialId: "coal", qty: 1 },
        ],
    },
    // 飲料
    {
        id: "apple_juice",
        name: "りんごジュース",
        category: "drink",
        ingredients: [{ materialId: "apple", qty: 1 }],
    },
    {
        id: "rainy_drink",
        name: "ラニードリンク",
        category: "drink",
        ingredients: [
            { materialId: "apple", qty: 1 },
            { materialId: "rainyjuice", qty: 1 },
        ],
    },
    {
        id: "t_soda",
        name: "Tソーダ",
        category: "drink",
        ingredients: [
            { materialId: "apple", qty: 1 },
            { materialId: "tbubble", qty: 1 },
        ],
    },
    {
        id: "magic_latte",
        name: "マジックラテ",
        category: "drink",
        ingredients: [
            { materialId: "apple", qty: 1 },
            { materialId: "magicmilk", qty: 1 },
        ],
    },
    {
        id: "gold_drink",
        name: "黄金ドリンク",
        category: "drink",
        ingredients: [
            { materialId: "apple", qty: 1 },
            { materialId: "goldenwater", qty: 1 },
        ],
    },
    // 薬品
    {
        id: "potion",
        name: "回復ポーション",
        category: "medicine",
        ingredients: [
            { materialId: "herb", qty: 1 },
            { materialId: "goldenwater", qty: 1 },
        ],
    },
    {
        id: "stimulant",
        name: "強壮剤",
        category: "medicine",
        ingredients: [
            { materialId: "herb", qty: 1 },
            { materialId: "rainyjuice", qty: 1 },
        ],
    },
    {
        id: "bubble_med",
        name: "泡薬",
        category: "medicine",
        ingredients: [
            { materialId: "goldenwater", qty: 1 },
            { materialId: "tbubble", qty: 1 },
        ],
    },
    {
        id: "magic_med",
        name: "魔力薬",
        category: "medicine",
        ingredients: [
            { materialId: "herb", qty: 1 },
            { materialId: "magicmilk", qty: 1 },
        ],
    },
    {
        id: "panacea",
        name: "万能薬",
        category: "medicine",
        ingredients: [
            { materialId: "herb", qty: 1 },
            { materialId: "saltwater", qty: 1 },
        ],
    },
    // 工芸品
    {
        id: "copper_work",
        name: "銅細工",
        category: "craft",
        ingredients: [{ materialId: "copper", qty: 1 }],
    },
    {
        id: "silver_work",
        name: "銀細工",
        category: "craft",
        ingredients: [{ materialId: "silver", qty: 1 }],
    },
    {
        id: "iron_work",
        name: "鉄細工",
        category: "craft",
        ingredients: [
            { materialId: "iron", qty: 1 },
            { materialId: "coal", qty: 1 },
        ],
    },
    {
        id: "crystal_acc",
        name: "水晶アクセサリー",
        category: "craft",
        ingredients: [
            { materialId: "crystal", qty: 1 },
            { materialId: "silver", qty: 1 },
        ],
    },
    {
        id: "gem_work",
        name: "宝石細工",
        category: "craft",
        ingredients: [
            { materialId: "crystal", qty: 1 },
            { materialId: "copper", qty: 1 },
        ],
    },
    {
        id: "magic_stone",
        name: "魔石細工",
        category: "craft",
        ingredients: [{ materialId: "magicstone", qty: 2 }],
    },
    {
        id: "fang_deco",
        name: "牙の装飾品",
        category: "craft",
        ingredients: [{ materialId: "monstertooth", qty: 2 }],
    },
    {
        id: "leather_work",
        name: "革細工",
        category: "craft",
        ingredients: [{ materialId: "monsterhide", qty: 2 }],
    },
    {
        id: "magic_orb",
        name: "魔力の宝珠",
        category: "craft",
        ingredients: [{ materialId: "magiccrystal", qty: 2 }],
    },
    {
        id: "gear_work",
        name: "歯車仕掛け",
        category: "craft",
        ingredients: [{ materialId: "ancientgear", qty: 2 }],
    },
];

// レシピの基準原価 = 材料の基準価格（×MULTIPLIER 前）× 個数 の合計。素材価格改定に自動追従する。
function recipeBaseCost(ingredients: RawRecipe["ingredients"]): number {
    return ingredients.reduce((sum, ing) => {
        const mat = getMaterial(ing.materialId);
        const base = mat ? computeBaseMaterialPrice(mat.ratePerMin) : 0;
        return sum + base * ing.qty;
    }, 0);
}

// 経済倍率を原価・売値に適用（売値 = ceil(原価 × 倍率 × 1.2)。素材を素のまま売るより常に +20%）
export const RECIPES: RecipeDef[] = RAW_RECIPES.map((r) => {
    const baseCost = recipeBaseCost(r.ingredients);
    return {
        ...r,
        baseCost: baseCost * MATERIAL_PRICE_MULTIPLIER,
        sellPrice: Math.ceil(baseCost * MATERIAL_PRICE_MULTIPLIER * 1.2),
    };
});

export const CATEGORY_LABEL: Record<RecipeDef["category"], string> = {
    food: "食品",
    processed: "加工食品",
    drink: "飲料",
    medicine: "薬品",
    craft: "工芸品",
};

export function getRecipe(id: string): RecipeDef | undefined {
    return RECIPES.find((r) => r.id === id);
}

// Medicine items usable in dungeon
export const DUNGEON_ITEMS = ["potion", "stimulant", "bubble_med", "magic_med", "panacea"];
