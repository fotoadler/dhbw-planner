package de.dhbw.raplaplan;

import static org.junit.Assert.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.JSONArray;
import org.json.JSONObject;
import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.view.View;
import android.widget.TextView;
import android.widget.LinearLayout;
import java.io.File;
import java.io.FileOutputStream;

@RunWith(AndroidJUnit4.class)
public class ScheduleWidgetRenderTest {
    @Test public void rendersAllSizesAndStatesWithoutRemoteViewsInflationErrors() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        long now=System.currentTimeMillis();
        JSONObject data=new JSONObject().put("version",1).put("unlocked",true).put("course","RV-WMKMM24B").put("profileId","primary").put("updatedAt",now);
        JSONArray events=new JSONArray();
        for(int i=0;i<5;i++)events.put(new JSONObject().put("title",new String[]{"Medienwirtschaft","Kommunikation","Marketing","Medienrecht","Projektarbeit"}[i]).put("room","RV "+(201+i)).put("start",now+(i+1)*3600000L).put("end",now+(i+2)*3600000L));
        JSONObject day=new JSONObject().put("date",ScheduleWidgetProvider.format(now,"yyyy-MM-dd")).put("known",true).put("events",events);
        data.put("days",new JSONArray().put(day));
        renderSizes(context,data,now,"schedule");
        assertStatus(context,data,now,"Als Nächstes");
        day.put("date",ScheduleWidgetProvider.format(now+7*3600000L,"yyyy-MM-dd"));
        assertStatus(context,data,now+7*3600000L,"Für heute geschafft");
        day.put("date",ScheduleWidgetProvider.format(now,"yyyy-MM-dd"));
        day.put("events",new JSONArray());
        assertStatus(context,data,now,"Heute keine Vorlesung");
        JSONObject tomorrow=new JSONObject().put("date",ScheduleWidgetProvider.format(now+86400000L,"yyyy-MM-dd")).put("known",true).put("events",new JSONArray().put(new JSONObject().put("title","Medienwirtschaft").put("room","RV 201").put("start",now+86400000L).put("end",now+90000000L)));
        data.put("days",new JSONArray().put(day).put(tomorrow));
        renderSizes(context,data,now,"free");
        day.put("known",false);assertStatus(context,data,now,"Stundenplan öffnen");
        data.put("unlocked",false);assertStatus(context,data,now,"Widgets für Unterstützer");
    }
    @Test public void hidesMissingRaplaMetadataInEverySizeAndShowsCourseAgain() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        long now=System.currentTimeMillis();
        JSONObject event=new JSONObject().put("title","Medienwirtschaft").put("room","").put("start",now+3600000L).put("end",now+7200000L);
        JSONObject day=new JSONObject().put("date",ScheduleWidgetProvider.format(now,"yyyy-MM-dd")).put("known",true).put("events",new JSONArray().put(event));
        JSONObject data=new JSONObject().put("unlocked",true).put("profileId","manual").put("course","").put("updatedAt",now).put("days",new JSONArray().put(day));
        renderSizes(context,data,now,"rapla");
        for(int size=1;size<=3;size++) {
            final int selected=size;
            InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
                View view=ScheduleWidgetProvider.render(context,950+selected,data,now,selected).apply(context,null);
                assertEquals(View.GONE,view.findViewById(R.id.widget_course).getVisibility());
                assertEquals(View.GONE,view.findViewById(R.id.widget_event_room).getVisibility());
                assertEquals("Medienwirtschaft",((TextView)view.findViewById(R.id.widget_event_title)).getText().toString());
            });
        }
        data.put("course","RV-WMKMM24B");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
            View view=ScheduleWidgetProvider.render(context,960,data,now,2).apply(context,null);
            assertEquals(View.VISIBLE,view.findViewById(R.id.widget_course).getVisibility());
        });
    }
    private void renderSizes(Context context,JSONObject data,long now,String state) {
        File output=new File(context.getExternalFilesDir(null),"widget-qa");output.mkdirs();
        for(int night:new int[]{Configuration.UI_MODE_NIGHT_NO,Configuration.UI_MODE_NIGHT_YES}){
            Configuration config=new Configuration(context.getResources().getConfiguration());config.uiMode=(config.uiMode&~Configuration.UI_MODE_NIGHT_MASK)|night;
            Context themed=context.createConfigurationContext(config);
            for(int size=1;size<=3;size++) {
                final int selected=size;
                InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
                    View view=ScheduleWidgetProvider.render(themed,900+selected,data,now,selected).apply(themed,null);
                    float density=themed.getResources().getDisplayMetrics().density;
                    int width=(int)((selected==1?170:360)*density),height=(int)((selected==3?380:170)*density);
                    view.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(height,View.MeasureSpec.EXACTLY));view.layout(0,0,width,height);
                    assertTrue("Footer must remain inside the widget",view.findViewById(R.id.widget_updated).getBottom()<=height);
                    Bitmap image=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);view.draw(new Canvas(image));
                    try(FileOutputStream stream=new FileOutputStream(new File(output,"android-"+state+"-"+(night==Configuration.UI_MODE_NIGHT_YES?"dark":"light")+"-"+selected+".png"))){image.compress(Bitmap.CompressFormat.PNG,100,stream);}catch(Exception error){throw new RuntimeException(error);}
                });
            }
        }
    }
    private void assertStatus(Context context,JSONObject data,long now,String expected) {
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{
            View view=ScheduleWidgetProvider.render(context,999,data,now,2).apply(context,null);
            assertEquals(expected,((TextView)view.findViewById(R.id.widget_status)).getText().toString());
        });
    }
}
