(function(global) {
  const IMAGE_SECTION_TITLE = '═══ ChatGPT 圖片生成指令 ═══';

  function buildChatGPTImagePromptRequest(context) {
    const examText = (context.examText || '').slice(0, 24000);
    return `你是一位國小評量配圖設計助理。請閱讀下方${context.mode || '考卷'}，判斷哪些題目真的需要配圖輔助作答，並只為必要題目產生可直接貼到 ChatGPT 影像生成的英文出圖 prompt。

【判斷規則】
1. 不要為每一題都產生圖片；只有圖表判讀、實驗情境、空間關係、流程、地圖、生活情境觀察、物件比較等需要視覺輔助的題目才產生。
2. 純計算、單純文字理解、字詞解釋、答案可由文字直接判斷的題目，不需要配圖。
3. 若題目本身已完整描述情境，圖片只補足視覺資訊，不可改變題意。

【圖片限制】
1. 圖片不得出現任何文字、數字、標籤、箭頭、題號、答案線索或題目關鍵答案。
2. 圖片應適合國小紙本評量列印：白底、構圖清楚、線條乾淨、物件少而明確。
3. 避免真實人臉、品牌、校名、商標、複雜背景與過度裝飾。
4. 若完全不需要配圖，請只輸出「（本份試卷無需配圖）」。
5. 請嚴格只輸出指定格式，不要加說明。

【基本資訊】
科目：${context.subject || ''}
年級：${context.grade || ''}
範圍：${context.scope || ''}
產出類型：${context.mode || '考卷'}

【輸出格式】
${IMAGE_SECTION_TITLE}
【題號】：對應題號
【圖片用途】：對應題號與用途
【ChatGPT出圖Prompt】：
Create a clean, printable elementary-school exam illustration for Taiwan curriculum.
- Style: simple flat illustration, child-friendly, white background, clear outlines, high contrast, suitable for worksheet printing
- Scene: describe the visual scene, object positions, actions, relative sizes, and composition in concrete detail
- Purpose: support the question context without revealing or implying the answer
- Constraints: no text, no numbers, no labels, no arrows, no answer clues, no realistic human faces, no brands, no complex background
- Output: one single image, landscape worksheet composition, uncluttered

若有多題需要配圖，請重複「【題號】／【圖片用途】／【ChatGPT出圖Prompt】」三行格式。

【內容】
${examText}`;
  }

  function buildCopyrightNotice() {
    return `COPYRIGHT © 2026 HSINCHU NEI HU PRIMARY SCHOOL
總務主任 江志宏
smallcannon@nhps.hc.edu.tw｜03-5373184 #130
系統：輔助命題系統｜最後維護：2026-05`;
  }

  global.NHPS_PROMPTS = {
    IMAGE_SECTION_TITLE,
    buildChatGPTImagePromptRequest,
    buildCopyrightNotice,
  };
})(window);
