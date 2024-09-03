const objDataProd = require("./wwwsalarycom.json");
const objDataDelta = require("./wwwdeltasalarycom.json");

var checkMistmatch = (strField = "ID") => {
  const arrResult = [];
  for (
    let i = 1;
    i <
    Math.min(Object.keys(objDataProd).length, Object.keys(objDataDelta).length);
    i++
  ) {
    const strKey = `Blog${i.toString().padStart(4, "0")}`;
    const objProd = objDataProd[strKey];
    const objDelta = objDataDelta[strKey];

    const strProd = objProd[strField]
      .toString()
      .replace(/[\.’]/g, "")
      .replace(/&amp;/g, "&");
    const strDelta = objDelta[strField]
      .toString()
      .replace(/[\.’]/g, "")
      .replace(/&amp;/g, "&");
    if (
      strProd !== strDelta
      // &&
      //objProd[strField] !== "Error Occured" &&
      //objDelta[strField] !== "Error Occured"
    ) {
      if (
        (strField === "FormTitle" || strField === "FormDesc") &&
        objProd["HasDownloadForm"] === false
      ) {
        continue;
      }
      arrResult.push({
        prod: {
          ID: objProd.ID,
          SETTitle: objProd.SEOTitle,
          [strField]: strProd,
        },
        delta: {
          ID: objDelta.ID,
          SETTitle: objDelta.SEOTitle,
          [strField]: strDelta,
        },
      });
    }
  }
  console.log(`Field: ${strField} Mismatch Count ${arrResult.length}`);
  //console.log(arrResult);

  arrResult.forEach((res) => {
    console.log("ID:", res.prod.ID);
    console.log("SEOTitle:", res.prod.SETTitle);
    console.log("Prod:", res.prod[strField]);
    console.log("Delta:", res.delta[strField], "\n");
  });
  /**/
};

//checkMistmatch("title");
//checkMistmatch("H1");
//checkMistmatch("Author");
//checkMistmatch("FormTitle");
//checkMistmatch("FormDesc");
//checkMistmatch("SideCTALink1Text");
//checkMistmatch("SideCTALink2Text");
checkMistmatch("HasDownloadForm");
checkMistmatch("HasAboutAuthor");
checkMistmatch("HasScheduleForm");

/**/

//checkMistmatch("SideCTALink1Text");
/*
const arrResult = []
Object.keys(objDataProd).forEach(key=>{
   const objData = objDataProd[key];
   if(!objData.HasDownloadForm){
      console.log(objData.ID, objData.SEOTitle)
   }
})

   /**/
console.log("Done");
