package de.dhbw.raplaplan;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.TimeZone;

public class ScheduleWidgetProvider extends AppWidgetProvider {
    private static final String REFRESH = "de.dhbw.raplaplan.WIDGET_REFRESH";
    private static final TimeZone BERLIN = TimeZone.getTimeZone("Europe/Berlin");
    private static final Class<?>[] PROVIDERS = {ScheduleSmallWidget.class, ScheduleMediumWidget.class, ScheduleLargeWidget.class};
    static String format(long time, String pattern) {
        SimpleDateFormat formatter = new SimpleDateFormat(pattern, Locale.GERMANY); formatter.setTimeZone(BERLIN);
        return formatter.format(new Date(time));
    }
    static JSONObject snapshot(Context context) {
        try { return new JSONObject(context.getSharedPreferences("schedule_widgets",0).getString("schedule.v1","{}")); }
        catch (Exception ignored) { return new JSONObject(); }
    }
    @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) { updateAll(context); }
    @Override public void onAppWidgetOptionsChanged(Context context, AppWidgetManager manager, int id, Bundle options) { updateAll(context); }
    @Override public void onDisabled(Context context) { updateAll(context); }
    @Override public void onReceive(Context context, Intent intent) {
        super.onReceive(context,intent);
        String action = intent.getAction();
        if (REFRESH.equals(action) || Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action) || Intent.ACTION_BOOT_COMPLETED.equals(action)) updateAll(context);
    }
    public static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context); JSONObject data = snapshot(context);
        long now = System.currentTimeMillis(); boolean installed = false;
        for (int size=1;size<=3;size++) {
            for (int id : manager.getAppWidgetIds(new ComponentName(context,PROVIDERS[size-1]))) {
                installed = true; Bundle options = manager.getAppWidgetOptions(id);
                int width=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,0), height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,0);
                int actual = width == 0 || height == 0 ? size : (height >= 300 && width >= 200 ? 3 : width >= 200 ? 2 : 1);
                manager.updateAppWidget(id,render(context,id,data,now,actual));
            }
        }
        Intent alarmIntent = new Intent(context,ScheduleWidgetProvider.class).setAction(REFRESH);
        PendingIntent alarm = PendingIntent.getBroadcast(context,5137,alarmIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        AlarmManager alarms=(AlarmManager)context.getSystemService(Context.ALARM_SERVICE);
        if (!installed) { alarms.cancel(alarm); return; }
        Calendar midnight=Calendar.getInstance(BERLIN); midnight.setTimeInMillis(now); midnight.add(Calendar.DATE,1);
        midnight.set(Calendar.HOUR_OF_DAY,0); midnight.set(Calendar.MINUTE,0); midnight.set(Calendar.SECOND,0); midnight.set(Calendar.MILLISECOND,0);
        long next=midnight.getTimeInMillis(); JSONArray days=data.optJSONArray("days");
        if(days!=null) for(int i=0;i<days.length();i++) {
            JSONObject day=days.optJSONObject(i); if(day==null)continue; JSONArray events=day.optJSONArray("events"); if(events==null)continue;
            for(int j=0;j<events.length();j++) { JSONObject e=events.optJSONObject(j); if(e==null)continue;
                long start=e.optLong("start"),end=e.optLong("end"); if(start>now)next=Math.min(next,start); if(end>now)next=Math.min(next,end);
            }
        }
        // No exact-alarm permission: Android may batch widget updates to conserve battery.
        alarms.setAndAllowWhileIdle(AlarmManager.RTC,Math.max(now+1000,next),alarm);
    }
    static RemoteViews render(Context context,int id,JSONObject data,long now,int size) {
        int layout=size==1?R.layout.schedule_widget_small:size==2?R.layout.schedule_widget_medium:R.layout.schedule_widget;
        RemoteViews views=new RemoteViews(context.getPackageName(),layout);
        String today=format(now,"yyyy-MM-dd"); JSONObject day=null; JSONArray days=data.optJSONArray("days");
        if(days!=null)for(int i=0;i<days.length();i++){JSONObject candidate=days.optJSONObject(i);if(candidate!=null&&today.equals(candidate.optString("date"))){day=candidate;break;}}
        boolean unlocked=data.optBoolean("unlocked"),known=day!=null&&day.optBoolean("known");
        List<JSONObject> all=new ArrayList<>(),remaining=new ArrayList<>();
        JSONArray events=day==null?null:day.optJSONArray("events");
        if(unlocked&&known&&events!=null) for(int i=0;i<events.length();i++){JSONObject event=events.optJSONObject(i);if(event!=null){all.add(event);if(event.optLong("end")>now)remaining.add(event);}}
        String status=!unlocked?"Widgets für Unterstützer":!known?"Stundenplan öffnen":all.isEmpty()?"Heute keine Vorlesung":remaining.isEmpty()?"Für heute geschafft":remaining.get(0).optLong("start")<=now?"Jetzt":"Als Nächstes";
        String course=data.optString("course","").trim();
        views.setTextViewText(R.id.widget_course,course);
        views.setViewVisibility(R.id.widget_course,course.isEmpty()?View.GONE:View.VISIBLE);
        views.setTextViewText(R.id.widget_day,format(now,"d"));views.setTextViewText(R.id.widget_month,format(now,"MMM"));
        if(size==3)views.setTextViewText(R.id.widget_weekday,format(now,"EEEE"));
        views.setTextViewText(R.id.widget_status,status);
        views.removeAllViews(R.id.widget_events);
        List<JSONObject> shown=size==3?all:remaining;
        boolean showEvents=unlocked&&known&&!shown.isEmpty();
        views.setViewVisibility(R.id.widget_status,showEvents?View.VISIBLE:View.GONE);
        views.setViewVisibility(R.id.widget_events,showEvents?View.VISIBLE:View.GONE);
        int limit=size==1?1:size==2?2:5;
        for(int i=0;i<Math.min(limit,shown.size());i++) {
            JSONObject event=shown.get(i); RemoteViews row=new RemoteViews(context.getPackageName(),size==1?R.layout.schedule_widget_event_small:R.layout.schedule_widget_event);
            row.setTextViewText(R.id.widget_event_time,format(event.optLong("start"),"HH:mm")+(size==1?" – ":"\n")+format(event.optLong("end"),"HH:mm"));
            row.setTextViewText(R.id.widget_event_title,event.optString("title"));
            row.setTextViewText(R.id.widget_event_room,event.optString("room"));
            row.setViewVisibility(R.id.widget_event_room,size==1||event.optString("room").isEmpty()?View.GONE:View.VISIBLE);
            views.addView(R.id.widget_events,row);
        }
        String title=!unlocked?(size==1?"Danke!":"Ein kleines Danke."):!known?"Dein Tag wartet.":all.isEmpty()?"Heute frei.":"Geschafft!";
        String subtitle=!unlocked?"Widgets für Unterstützer":!known?"Stundenplan in der App laden":all.isEmpty()?"Keine Vorlesungen":"Alle Vorlesungen für heute vorbei";
        views.setTextViewText(R.id.widget_empty_title,title);views.setTextViewText(R.id.widget_empty_subtitle,subtitle);
        views.setTextViewTextSize(R.id.widget_empty_title,android.util.TypedValue.COMPLEX_UNIT_SP,size==1?21:size==2?23:27);
        views.setViewVisibility(R.id.widget_empty_title,showEvents?View.GONE:View.VISIBLE);views.setViewVisibility(R.id.widget_empty_subtitle,showEvents?View.GONE:View.VISIBLE);
        String hint=showEvents?(size==3&&all.size()>5?"+ "+(all.size()-5)+" weitere in der App":""):unlocked&&known?"Tagesansicht öffnen ↗":"App öffnen ↗";
        if(size==1)hint="";
        if(size==3){
            views.setViewVisibility(R.id.widget_empty_hero,showEvents?View.GONE:View.VISIBLE);
            views.setViewVisibility(R.id.widget_spacer,showEvents?View.VISIBLE:View.GONE);
            views.setImageViewResource(R.id.widget_illustration,unlocked&&known?R.drawable.widget_free_illustration:R.drawable.widget_calendar);
            views.setViewVisibility(R.id.widget_week,!showEvents&&unlocked&&known?View.VISIBLE:View.GONE);
            views.removeAllViews(R.id.widget_week);
            JSONObject next=null;
            if(days!=null)for(int i=0;i<days.length();i++){
                JSONObject candidate=days.optJSONObject(i);if(candidate==null)continue;
                JSONArray later=candidate.optJSONArray("events");
                if(next==null&&candidate.optBoolean("known")&&candidate.optString("date").compareTo(today)>0&&later!=null&&later.length()>0)next=later.optJSONObject(0);
            }
            Calendar cellDate=Calendar.getInstance(BERLIN);cellDate.setTimeInMillis(now);
            for(int i=0;i<7;i++){
                String key=format(cellDate.getTimeInMillis(),"yyyy-MM-dd");JSONObject cellDay=null;
                if(days!=null)for(int j=0;j<days.length();j++){JSONObject candidate=days.optJSONObject(j);if(candidate!=null&&key.equals(candidate.optString("date"))){cellDay=candidate;break;}}
                RemoteViews cell=new RemoteViews(context.getPackageName(),R.layout.schedule_widget_day);
                cell.setTextViewText(R.id.widget_week_label,format(cellDate.getTimeInMillis(),"EE"));cell.setTextViewText(R.id.widget_week_number,format(cellDate.getTimeInMillis(),"d"));
                boolean hasEvents=cellDay!=null&&cellDay.optBoolean("known")&&cellDay.optJSONArray("events")!=null&&cellDay.optJSONArray("events").length()>0;
                cell.setTextViewText(R.id.widget_week_dot,cellDay!=null&&cellDay.optBoolean("known")?"•":"○");
                if(hasEvents)cell.setTextColor(R.id.widget_week_dot,context.getColor(R.color.widget_accent));
                if(i==0){cell.setInt(R.id.widget_week_day_root,"setBackgroundResource",R.drawable.widget_soft_tile);cell.setTextColor(R.id.widget_week_number,context.getColor(R.color.widget_accent));}
                views.addView(R.id.widget_week,cell);cellDate.add(Calendar.DATE,1);
            }
            boolean showNext=!showEvents&&unlocked&&known&&next!=null;
            views.setViewVisibility(R.id.widget_next,showNext?View.VISIBLE:View.GONE);
            if(showNext){views.setTextViewText(R.id.widget_next_time,format(next.optLong("start"),"EE, dd.MM. · HH:mm"));views.setTextViewText(R.id.widget_next_title,next.optString("title"));hint="";
                Uri nextLink=new Uri.Builder().scheme("dhbwplanner").authority("day").appendQueryParameter("date",format(next.optLong("start"),"yyyy-MM-dd")).appendQueryParameter("profile",data.optString("profileId")).build();
                Intent nextOpen=new Intent(context,MainActivity.class).setAction(Intent.ACTION_VIEW).setData(nextLink).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
                views.setOnClickPendingIntent(R.id.widget_next,PendingIntent.getActivity(context,id,nextOpen,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));}
        }
        views.setTextViewText(R.id.widget_hint,hint);views.setViewVisibility(R.id.widget_hint,hint.isEmpty()?View.GONE:View.VISIBLE);
        long updated=data.optLong("updatedAt");views.setTextViewText(R.id.widget_updated,updated>0&&unlocked?"Stand "+format(updated,"dd.MM. HH:mm"):"");
        Uri link=unlocked?new Uri.Builder().scheme("dhbwplanner").authority("day").appendQueryParameter("date",today).appendQueryParameter("profile",data.optString("profileId")).build():Uri.parse("dhbwplanner://support");
        Intent open=new Intent(context,MainActivity.class).setAction(Intent.ACTION_VIEW).setData(link).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        views.setOnClickPendingIntent(R.id.widget_root,PendingIntent.getActivity(context,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        return views;
    }
}
