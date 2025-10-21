// Test Higgsfield API
const API_KEY = 'b1733d1b-b7a5-4466-b68d-278fb3ed0d6e';
const API_SECRET = '5f5b031203bfd2df0b51d5b5a908d18e50074a50cf5b053d61cab084edabef44';

async function testHiggsfieldAPI() {
  console.log('🧪 Testing Higgsfield API...');
  
  try {
    // Test 1: Soul-styles endpoint (GET)
    console.log('\n📋 Test 1: Getting soul-styles...');
    const soulStylesResponse = await fetch('https://platform.higgsfield.ai/v1/text2image/soul-styles', {
      method: 'GET',
      headers: {
        'hf-api-key': API_KEY,
        'hf-secret': API_SECRET,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Soul-styles status:', soulStylesResponse.status);
    if (soulStylesResponse.ok) {
      const soulStyles = await soulStylesResponse.json();
      console.log('✅ Soul-styles loaded:', soulStyles.length, 'styles');
    } else {
      const error = await soulStylesResponse.text();
      console.log('❌ Soul-styles error:', error);
    }
    
    // Test 2: Generate image (POST)
    console.log('\n🎨 Test 2: Generating image...');
    const generateResponse = await fetch('https://platform.higgsfield.ai/v1/text2image/soul', {
      method: 'POST',
      headers: {
        'hf-api-key': API_KEY,
        'hf-secret': API_SECRET,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        params: {
          prompt: 'A beautiful sunset over mountains with golden light',
          width_and_height: '1152x2048',
          enhance_prompt: true,
          style_id: '464ea177-8d40-4940-8d9d-b438bab269c7',
          style_strength: 1,
          quality: '1080p',
          seed: 500000,
          batch_size: 1
        }
      })
    });
    
    console.log('Generate status:', generateResponse.status);
    if (generateResponse.ok) {
      const result = await generateResponse.json();
      console.log('✅ Image generation started:', result);
    } else {
      const error = await generateResponse.text();
      console.log('❌ Generate error:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testHiggsfieldAPI();
