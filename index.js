const app = require("express")();
const axios = require('axios');
const cheerio = require('cheerio');

let chrome = {};
let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
  chrome = require("chrome-aws-lambda");
  puppeteer = require("puppeteer-core");
} else {
  puppeteer = require("puppeteer");
}

app.get("/api", async (req, res) => {
  let options = {};

  if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    options = {
      args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
      defaultViewport: chrome.defaultViewport,
      executablePath: await chrome.executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    };
  }

  // Function to get the page data (HTML) using Axios
  async function getPageData(url) {
    try {
      const data = await axios.get(url);
      return data.data;
    } catch (e) {
      console.error('getPageData error', e.message);
      return null;
    }
  }

  // Function to parse the CAPTCHA sitekey from the page
  function parserData(html) {
    try {
      const $ = cheerio.load(html);
      return $('[data-sitekey]').data('sitekey'); // Get the reCAPTCHA sitekey
    } catch (e) {
      console.error('parserData error', e.message);
      return null;
    }
  }

  // Function to create a CAPTCHA-solving task
  async function createCaptchaTask(url, siteKey, isInvisible) {
    try {
      const data = await axios.post('https://api.nextcaptcha.com/createTask', {
        "clientKey": "next_bdab8a7051418d03061cf13cbf1ff01789", // clientKey from NextCaptcha dashboard
        "task": {
          type: "RecaptchaV2TaskProxyless",
          websiteURL: url,
          websiteKey: siteKey,
          isInvisible: isInvisible
        }
      });
      return data.data;
    } catch (e) {
      console.error('createCaptchaTask error', e.message);
      return null;
    }
  }

  // Function to wait and get the result of the CAPTCHA task
  async function getTaskResult(taskId, tryTimes = 60) {
    try {
      const data = await axios.post('https://api.nextcaptcha.com/getTaskResult', {
        "clientKey": "next_bdab8a7051418d03061cf13cbf1ff01789", // clientKey from NextCaptcha
        taskId
      });
      if (data.data.status === 'ready') {
        return data.data;
      } else if (data.data.status === 'processing' && tryTimes >= 0) {
        await sleep();
        return getTaskResult(taskId, tryTimes - 1);
      } else {
        if (tryTimes < 0) {
          console.error('getTaskResult out of time');
        } else {
          console.error('getTaskResult errorCode', data.data.errorCode);
          console.error('getTaskResult errorDescription', data.data.errorDescription);
        }
        return null;
      }
    } catch (e) {
      console.error('getTaskResult error', e.message);
      return null;
    }
  }

  // Function to add a sleep delay
  async function sleep(time = 500) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, time);
    });
  }

  try {
    let browser = await puppeteer.launch(options);


    (async () => {
      // Launch Puppeteer in non-headless mode
      const page = await browser.newPage();

      // Navigate to 99faucet.com login page
      await page.goto('https://99faucet.com/login');

      // Wait for the email input and fill it
      await page.waitForSelector('input[name="email"]');
      await page.type('input[name="email"]', 'kripeshmainali100@gmail.com', { delay: 100 });

      // Wait for the password input and fill it
      await page.waitForSelector('input[name="password"]');
      await page.type('input[name="password"]', 'pokemongo123', { delay: 100 });

      // Wait for the page to load CAPTCHA if it's present
      const html = await page.content(); // Get the HTML of the page
      const siteKey = parserData(html); // Extract the sitekey (CAPTCHA key)

      if (siteKey) {
        console.log('Captcha detected! Solving...');
        const task = await createCaptchaTask('https://99faucet.com/login', siteKey, false); // If CAPTCHA is visible, pass `false`
        const result = await getTaskResult(task.taskId); // Get the CAPTCHA solution

        if (result && result.solution && result.solution.gRecaptchaResponse) {
          // Inject the CAPTCHA solution into the form
          await page.evaluate((response) => {
            document.getElementById('g-recaptcha-response').innerText = response;
          }, result.solution.gRecaptchaResponse);
          console.log('Captcha solved and response injected!');
        }
      }

      // Wait for the login button and click it
      await page.waitForSelector('button[type="submit"]');
      await page.click('button[type="submit"]');
      console.log('Logged in successfully!');



      // GP captcha buster created by kripesh mainali
      while (true) {
        // Wait for the page to navigate after login
        await page.waitForNavigation();
        await page.goto('https://99faucet.com/notimer');


        await sleep(8000);
        let svgElement;
        // Use page.evaluate() to run code within the page's context
        const text_capitalize = await page.evaluate(() => {
          const textCapitalize = document.querySelector(".text-capitalize");

          // Retrieve text content and selected value
          return textCapitalize ? textCapitalize.innerHTML : null;
        });
        console.log(text_capitalize);

        if (text_capitalize == "plane") {
          svgElement = await page.$('path[d="M472 200H360.211L256.013 5.711A12 12 0 0 0 245.793 0h-57.787c-7.85 0-13.586 7.413-11.616 15.011L209.624 200H99.766l-34.904-58.174A12 12 0 0 0 54.572 136H12.004c-7.572 0-13.252 6.928-11.767 14.353l21.129 105.648L.237 361.646c-1.485 7.426 4.195 14.354 11.768 14.353l42.568-.002c4.215 0 8.121-2.212 10.289-5.826L99.766 312h109.858L176.39 496.989c-1.97 7.599 3.766 15.011 11.616 15.011h57.787a12 12 0 0 0 10.22-5.711L360.212 312H472c57.438 0 104-25.072 104-56s-46.562-56-104-56z"]');

        } else if (text_capitalize == "flag") {
          svgElement = await page.$('path[d="M349.565 98.783C295.978 98.783 251.721 64 184.348 64c-24.955 0-47.309 4.384-68.045 12.013a55.947 55.947 0 0 0 3.586-23.562C118.117 24.015 94.806 1.206 66.338.048 34.345-1.254 8 24.296 8 56c0 19.026 9.497 35.825 24 45.945V488c0 13.255 10.745 24 24 24h16c13.255 0 24-10.745 24-24v-94.4c28.311-12.064 63.582-22.122 114.435-22.122 53.588 0 97.844 34.783 165.217 34.783 48.169 0 86.667-16.294 122.505-40.858C506.84 359.452 512 349.571 512 339.045v-243.1c0-23.393-24.269-38.87-45.485-29.016-34.338 15.948-76.454 31.854-116.95 31.854z"]');
        } else if (text_capitalize == "heart") {
          svgElement = await page.$('path[d="M414.9 24C361.8 24 312 65.7 288 89.3 264 65.7 214.2 24 161.1 24 70.3 24 16 76.9 16 165.5c0 72.6 66.8 133.3 69.2 135.4l187 180.8c8.8 8.5 22.8 8.5 31.6 0l186.7-180.2c2.7-2.7 69.5-63.5 69.5-136C560 76.9 505.7 24 414.9 24z"]');

        } else if (text_capitalize == "key") {
          svgElement = await page.$('path[d="M512 176.001C512 273.203 433.202 352 336 352c-11.22 0-22.19-1.062-32.827-3.069l-24.012 27.014A23.999 23.999 0 0 1 261.223 384H224v40c0 13.255-10.745 24-24 24h-40v40c0 13.255-10.745 24-24 24H24c-13.255 0-24-10.745-24-24v-78.059c0-6.365 2.529-12.47 7.029-16.971l161.802-161.802C163.108 213.814 160 195.271 160 176 160 78.798 238.797.001 335.999 0 433.488-.001 512 78.511 512 176.001zM336 128c0 26.51 21.49 48 48 48s48-21.49 48-48-21.49-48-48-48-48 21.49-48 48z"]');

        } else if (text_capitalize == "tree") {
          svgElement = await page.$('path[d="M377.33 375.429L293.906 288H328c21.017 0 31.872-25.207 17.448-40.479L262.79 160H296c20.878 0 31.851-24.969 17.587-40.331l-104-112.003c-9.485-10.214-25.676-10.229-35.174 0l-104 112.003C56.206 134.969 67.037 160 88 160h33.21l-82.659 87.521C24.121 262.801 34.993 288 56 288h34.094L6.665 375.429C-7.869 390.655 2.925 416 24.025 416H144c0 32.781-11.188 49.26-33.995 67.506C98.225 492.93 104.914 512 120 512h144c15.086 0 21.776-19.069 9.995-28.494-19.768-15.814-33.992-31.665-33.995-67.496V416h119.97c21.05 0 31.929-25.309 17.36-40.571z"]');

        } else if (text_capitalize == "car") {
          svgElement = await page.$('path[d="M499.991 168h-54.815l-7.854-20.944c-9.192-24.513-25.425-45.351-46.942-60.263S343.651 64 317.472 64H194.528c-26.18 0-51.391 7.882-72.908 22.793-21.518 14.912-37.75 35.75-46.942 60.263L66.824 168H12.009c-8.191 0-13.974 8.024-11.384 15.795l8 24A12 12 0 0 0 20.009 216h28.815l-.052.14C29.222 227.093 16 247.997 16 272v48c0 16.225 6.049 31.029 16 42.309V424c0 13.255 10.745 24 24 24h48c13.255 0 24-10.745 24-24v-40h256v40c0 13.255 10.745 24 24 24h48c13.255 0 24-10.745 24-24v-61.691c9.951-11.281 16-26.085 16-42.309v-48c0-24.003-13.222-44.907-32.772-55.86l-.052-.14h28.815a12 12 0 0 0 11.384-8.205l8-24c2.59-7.771-3.193-15.795-11.384-15.795zm-365.388 1.528C143.918 144.689 168 128 194.528 128h122.944c26.528 0 50.61 16.689 59.925 41.528L391.824 208H120.176l14.427-38.472zM88 328c-17.673 0-32-14.327-32-32 0-17.673 14.327-32 32-32s48 30.327 48 48-30.327 16-48 16zm336 0c-17.673 0-48 1.673-48-16 0-17.673 30.327-48 48-48s32 14.327 32 32c0 17.673-14.327 32-32 32z"]');

        } else if (text_capitalize == "house") {
          svgElement = await page.$('path[d="M488 312.7V456c0 13.3-10.7 24-24 24H348c-6.6 0-12-5.4-12-12V356c0-6.6-5.4-12-12-12h-72c-6.6 0-12 5.4-12 12v112c0 6.6-5.4 12-12 12H112c-13.3 0-24-10.7-24-24V312.7c0-3.6 1.6-7 4.4-9.3l188-154.8c4.4-3.6 10.8-3.6 15.3 0l188 154.8c2.7 2.3 4.3 5.7 4.3 9.3zm83.6-60.9L488 182.9V44.4c0-6.6-5.4-12-12-12h-56c-6.6 0-12 5.4-12 12V117l-89.5-73.7c-17.7-14.6-43.3-14.6-61 0L4.4 251.8c-5.1 4.2-5.8 11.8-1.6 16.9l25.5 31c4.2 5.1 11.8 5.8 16.9 1.6l235.2-193.7c4.4-3.6 10.8-3.6 15.3 0l235.2 193.7c5.1 4.2 12.7 3.5 16.9-1.6l25.5-31c4.2-5.2 3.4-12.7-1.7-16.9z"]');

        } else if (text_capitalize == "truck") {
          svgElement = await page.$('path[d="M624 352h-16V243.9c0-12.7-5.1-24.9-14.1-33.9L494 110.1c-9-9-21.2-14.1-33.9-14.1H416V48c0-26.5-21.5-48-48-48H48C21.5 0 0 21.5 0 48v320c0 26.5 21.5 48 48 48h16c0 53 43 96 96 96s96-43 96-96h128c0 53 43 96 96 96s96-43 96-96h48c8.8 0 16-7.2 16-16v-32c0-8.8-7.2-16-16-16zM160 464c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm320 0c-26.5 0-48-21.5-48-48s21.5-48 48-48 48 21.5 48 48-21.5 48-48 48zm80-208H416V144h44.1l99.9 99.9V256z"]');

        } else if (text_capitalize == "star") {
          svgElement = await page.$('path[d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"]');

        } else {
          console.log("if else error");

        }

        if (svgElement) {
          const parentElements = await svgElement.evaluateHandle(el => el.parentElement);
          const nextSibling = await parentElements.evaluateHandle(el => el.nextElementSibling);
          var nextSiblingContent = await nextSibling.evaluate(el => el.value);
          console.log(nextSiblingContent);
          await page.evaluateHandle((nextSiblingContent) => {
            const captcha_choosen = document.getElementById('captcha_choosen');  // Select the hidden input
            if (captcha_choosen) {
              captcha_choosen.value = nextSiblingContent;  // Set the value to nextSiblingContent
            }
          }, nextSiblingContent);



        }





        sleep(300)
        await page.waitForSelector('button[type="submit"]');
        await page.click('button[type="submit"]');
        console.log("claimed successfully");

        sleep(100000)

      }

    })();
  } catch (err) {
    console.error(err);
    return null;
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server started");
});

module.exports = app;
