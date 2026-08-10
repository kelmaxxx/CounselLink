import ImageModule from "docxtemplater-image-module-free";

const imageModule = new ImageModule({
  centered: false,
  getImage: (tagValue) => Buffer.from(tagValue, "base64"),
  getSize: function(img, tagValue, tagName) {
    console.log("getSize arguments count:", arguments.length);
    console.log("img is Buffer:", Buffer.isBuffer(img));
    console.log("tagValue length:", tagValue ? tagValue.length : 0);
    console.log("tagName:", tagName);
    return [100, 100];
  }
});

// Let's call getSize directly if we can, or see if it's documented.
// Actually, let's look at the parameters of the function:
console.log("imageModule.options.getSize:", imageModule.options.getSize.toString());
