const Validator = require("validator");
const isEmpty = require("./is-empty");

module.exports = function validatePostInput(data) {
  let errors = {};

  data.title = !isEmpty(data.title) ? data.title : "";

  if (Validator.isEmpty(data.title)) {
    errors.title = "Title field is required";
  }

  data.description = !isEmpty(data.description) ? data.description : "";

  if (!Validator.isLength(data.description, { min: 10, max: 500 })) {
    errors.description = "Post must be between 10 and 500 characters";
  }
  if (Validator.isEmpty(data.description)) {
    errors.description = "Description field is required";
  }

  data.location = !isEmpty(data.location) ? data.location : "";
  if (Validator.isEmpty(data.location)) {
    errors.location = "Location field is required";
  }

  data.categoryName = !isEmpty(data.categoryName) ? data.categoryName : "";
  if (Validator.isEmpty(data.categoryName)) {
    errors.categoryName = "CategoryName field is required";
  }

  data.subCategory = !isEmpty(data.subCategory) ? data.subCategory : "";
  if (Validator.isEmpty(data.subCategory)) {
    errors.subCategory = "subCategory field is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
