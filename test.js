async function test() {
  try {
    console.log("Registering...");
    const r1 = await fetch("http://localhost:3001/api/auth/register", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "test4@test.com", password: "password123", name: "Test" })
    });
    console.log("Register Auth status:", r1.status);
    const data1 = await r1.json();

    console.log("Logging in...");
    const r2 = await fetch("http://localhost:3001/api/auth/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: "test4@test.com", password: "password123" })
    });
    console.log("Login status:", r2.status);
    const data2 = await r2.json();

    console.log("Fetching /api/me...");
    const r3 = await fetch("http://localhost:3001/api/me", {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${data2.token}` }
    });
    console.log("Me status:", r3.status);
    const data3 = await r3.json();
    console.log("Me returned learningState:", data3.learningState);
  } catch (e) {
    console.error("Test failed:", e);
  }
}

test();
