const fs = require("fs");
const puppeteer = require("puppeteer");
const arrBlogs = require("./AllBlogs.json");

const Crawler = {
  domain: "wwwdelta.salary.com",
  wwwsalarycom: {
    title: "title",
    H1: "h1.sa-title-h2",
    Author: ".sa-top-desc-size",
    FormTitle: "#sa-insights-form-title",
    FormDesc: "#sa-insights-form-desc",

    HasDownloadForm: ".sa-insights-form-eyebow",
    HasAboutAuthor: ".sa-about-author",
    HasScheduleForm: "[class='sa-emp-hero-btn']",

    SideCTALink1Text: "#sa_sidebar_btn_cta_1",
    SideCTALink2Text: "#sa_sidebar_btn_cta_2",
  },
  wwwdeltasalarycom: {
    title: "title",
    H1: ".hero-text-wrapper h1",
    Author: ".written-by .author",
    FormTitle: ".form-title",
    FormDesc: ".form-desc",

    HasDownloadForm: ".download-form-wrapper",
    HasAboutAuthor: ".sa-about-author",
    HasScheduleForm: ".schedule-form-wrapper",

    SideCTALink1Text: ".sidebar-wrapper .btn-grp a:nth-child(1)",
    SideCTALink2Text: ".sidebar-wrapper .btn-grp a:nth-child(2)",
  },
  browser: null,
  result: {},
  tabcount: 0,
  status: "",
  init: async function () {
    this.browser = await puppeteer.launch({
      headless: true,
      defaultViewport: false,
      userDataDir: "./tmp",
    });
  },
  stop: function () {
    this.status = "stop";
  },
  getFileName: function () {
    return this.domain.replace(/[^\w]/g, "");
  },
  checkResult: function (objResult = {}) {
    const arrResultKeys = Object.keys(objResult).map((key) =>
      key.replace(/Blog0*/, "")
    );
    const arrUncheckBlog = arrBlogs
      .filter((blog) => !arrResultKeys.includes(blog.id.toString()))
      .map((blog) => blog.id + "");
    const arrErrorChecked = arrResultKeys.filter((key) => {
      const objBlogResult = objResult[`Blog${key.toString().padStart(4, "0")}`];
      return (
        Object.keys(objBlogResult).filter(
          (key) => {
            if((key === "FormTitle" || key === "FormDesc")){
               return (objBlogResult[key] === "Error Occured" && objBlogResult["HasDownloadForm"])
            }
            return objBlogResult[key] === "Error Occured"
          }
        ).length > 0
      );
    });

    const arrNeedToCheck = [...arrErrorChecked, ...arrUncheckBlog];
    console.log("Blog List", arrBlogs.length);
    console.log("Checked Blogs", arrResultKeys.length);
    console.log("Checked Blogs w/ Issue", arrErrorChecked.length);
    console.log("Unchecked Blogs", arrUncheckBlog.length);
    console.log("Total Blogs to Check", arrNeedToCheck.length);

    const arrNewList = arrBlogs.filter((blog) => {
      return arrNeedToCheck.includes(blog.id.toString());
    });
    return arrNewList;
  },
  start: async function () {
    const strFilePath = `${this.getFileName()}.json`;
    const objResult = this.readDataFile(`./${strFilePath}`) || {};
    if (Object.keys(objResult).length > 0) {
      this.result = { ...objResult };
    }
    const arrBlogList = this.checkResult(objResult);
    //console.log("arrBlogList", arrBlogList)
    console.log(`\nCrawling ${this.domain}\n`);
    
    await this.init();
    var arrPromise = [];
    var tabCount = 1;
    var baseCount = Math.floor(arrBlogList.length / tabCount);
    for (let i = 0; i < tabCount; i++) {
      arrPromise.push(
        this.task(arrBlogList.slice(baseCount * i, baseCount * (i + 1)))
      );
    }

    await Promise.all(arrPromise).catch(console.log);
    console.log("Saving...");
    //Save

    try {
      fs.writeFileSync(strFilePath, JSON.stringify(this.result));
      console.log("JSON data saved to file successfully.");
    } catch (error) {
      console.error("Error writing JSON data to file:", error);
    }

    await this.browser.close();
  },
  task: async function (arrBlogs) {
    this.tabcount++;
    const tabID = this.tabcount;
    const page = await this.browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36');
    await page.setRequestInterception(true);
    page.on("request", this.interceptImage);
    page.on("dialog", async (dialog) => {
      console.log(`Dialog message: ${dialog.message()}`);
      await dialog.accept(); // Automatically accept the dialog
    });
    let counter = 0;
    try {
      while (counter < arrBlogs.length && this.status !== "stop") {
        const ID = arrBlogs[counter]?.id;
        const SEOTitle = arrBlogs[counter]?.SEOTitle;
        try {
          this.result[`Blog${ID.toString().padStart(4, "0")}`] =
            await this.processData(tabID, page, ID, SEOTitle);
        } catch (err) {
          console.log(`${tabID} Failed to check ${SEOTitle}`);
        }
        counter++;
      }
    } catch (err) {
      console.log(err);
    }
  },
  interceptImage: function (request) {
    const url = request.url();
    const resourceType = request.resourceType();
    if (
      resourceType === "stylesheet" ||
      resourceType === "font" ||
      url.endsWith(".jpg") ||
      url.endsWith(".jpeg") ||
      url.endsWith(".png") ||
      url.endsWith(".gif") ||
      (url.endsWith(".svg") && !url.endsWith("sdc-logo-header.svg")) ||
      !url.includes("salary.com")
    ) {
      request.abort();
    } else {
      request.continue();
    }
  },
  getData: async function (page, strSelector = "", strKey = "") {
    try {
      await page.waitForSelector(strSelector, { timeout: 1000 });
      const data = await page.$eval(strSelector, (el) =>
        el.textContent.trim().replace(/\n/g, " ").replace(/\s+/g, " ")
      );
      return strKey.startsWith("Has") ? true : data;
    } catch (err) {
      console.log("Error Occured while getting", strSelector);
    }
    return strKey.startsWith("Has") ? false : "Error Occured";
  },
  processData: async function (tabID, page, ID, SEOTitle) {
    try {
      console.log(`${tabID} Checking ${ID} ${SEOTitle}`);

      // Navigate to the page with a timeout
      await page.goto(`https://${this.domain}/blog/${SEOTitle}`, {
        timeout: 60000,
      });

      const objResult = { ID, SEOTitle };
      const fileName = this.getFileName(); // Cache the file name
      const keys = Object.keys(this[fileName]);

      // Using Promise.all to parallelize async calls
      const dataPromises = keys.map(async (key) => {
        const data = await this.getData(page, this[fileName][key], key);
        return { key, data };
      });

      const results = await Promise.all(dataPromises);

      results.forEach(({ key, data }) => {
        objResult[key] = data;
      });

      return objResult;
    } catch (error) {
      console.error(`Error processing ${ID} ${SEOTitle}:`, error);
      throw error; // Re-throw the error after logging
    }
  },
  readDataFile: function (strPath) {
    let objData = null;
    try {
      objData = require(strPath);
    } catch (err) {
      console.log("Error: cannot open", strPath);
    }
    return objData || null;
  },
};

Crawler.start();
