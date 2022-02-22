import { queryCourseListInfo } from "@/service/courseAPI";
import { ref } from "vue";

const STATUS_MAP = {
  test: "test",
  online: "online",
};

export const courseList = ref([]);

queryCourseListInfo(STATUS_MAP.test).then((data) => {
  courseList.value = data;
});