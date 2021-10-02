import { provide } from "inversify-binding-decorators";
import { URLSearchParams } from "url";

@provide(DataStructureHelper)
export class DataStructureHelper {
  public queryStringToObject(queryString: string): object {
    const params = new URLSearchParams(queryString);

    const result = {};
    for (const [key, value] of params) {
      // each 'entry' is a [key, value] tupple
      result[key] = value;
    }
    return result;
  }

  public objectToQueryString(params): string {
    return Object.keys(params)
      .map((key) => key + "=" + params[key])
      .join("&");
  }

  public getMostRecentData = (arrWithDateField: any[]): any => {
    const sorted = arrWithDateField.sort((x, y) => (x.date > y.date ? -1 : 1));

    return sorted[0];
  };
}
