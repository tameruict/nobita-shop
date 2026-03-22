const urls = [
  "https://thueapibank.vn/historyapivcbv3/none/9356026163/d5259d1f01433a8068f98b935d2b48aa",
  "https://thueapibank.vn/historyapivcbv3/1/9356026163/d5259d1f01433a8068f98b935d2b48aa",
  "https://thueapibank.vn/historyapivcbv3/d5259d1f01433a8068f98b935d2b48aa",
  "https://thueapibank.vn/historyapivcbv3/9356026163/d5259d1f01433a8068f98b935d2b48aa",
  "https://thueapibank.vn/api/GetHistoryVCB/d5259d1f01433a8068f98b935d2b48aa"
];

async function test() {
  for (const url of urls) {
    console.log(`Testing: ${url}`);
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Response: ${text.substring(0, 100)}\n`);
    } catch (e) {
      console.log(`Error: ${e.message}\n`);
    }
  }
}
test();
